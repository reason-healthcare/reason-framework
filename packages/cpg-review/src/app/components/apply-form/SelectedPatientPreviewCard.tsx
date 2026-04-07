import {
  DownOutlined,
  FileTextOutlined,
  HeartOutlined,
  LineChartOutlined,
  MedicineBoxOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Typography } from 'antd'
import { useState } from 'react'
import { formatProperty, notEmpty } from 'helpers'
import {
  PatientSummary,
  makeBundlePatientSummary,
} from 'utils/recentPatientsStore'
import {
  deriveContext,
  formatAddress,
  mrnValue,
  parseBundle,
  parseRawJson,
  ResourceIdentifier,
} from 'utils/fhirContextDeriver'

const { Text } = Typography

const META = ['id', 'text', 'meta']

interface SelectedPatientPreviewCardProps {
  subject: ResourceIdentifier | undefined
  dataPayload: string | undefined
  selectedPatient: PatientSummary | undefined
  onClear: () => void
}

function renderResourceProperties(resource: fhir4.FhirResource) {
  return Object.entries(resource)
    .map(([key, value]) => {
      if (!META.includes(key)) {
        return formatProperty(value, undefined, undefined, key, false)
      }
    })
    .filter(notEmpty)
}

const SelectedPatientPreviewCard = ({
  subject,
  dataPayload,
  selectedPatient,
  onClear,
}: SelectedPatientPreviewCardProps) => {
  if (!subject) return null

  const bundle = parseBundle(dataPayload)
  const { patient, medications, conditions, observations } = deriveContext(
    bundle,
    subject
  )

  const fallbackSummary: PatientSummary | undefined =
    patient && bundle
      ? makeBundlePatientSummary(
          bundle,
          patient,
          typeof dataPayload === 'string' ? dataPayload : undefined,
          { addedAt: new Date(0).toISOString(), patientId: subject.id }
        )
      : undefined

  const summary = selectedPatient ?? fallbackSummary
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeSection, setActiveSection] = useState<
    'overview' | 'medications' | 'conditions' | 'observations' | 'raw-json'
  >('overview')
  const rawFhirPayload = parseRawJson(selectedPatient?.json || dataPayload)
  const isEndpointSelected = summary?.source === 'endpoint'

  const medicationsEmptyState = isEndpointSelected
    ? 'Medication data is not loaded for endpoint-selected patients in this selection.'
    : 'No medications available for this patient context.'

  const conditionsEmptyState = isEndpointSelected
    ? 'Condition data is not loaded for endpoint-selected patients in this selection.'
    : 'No conditions available for this patient context.'

  const observationsEmptyState = isEndpointSelected
    ? 'Observation data is not loaded for endpoint-selected patients in this selection.'
    : 'No observations available for this patient context.'
  const fullName = summary?.name || `Patient/${subject.id}`
  const mrn = mrnValue(patient)
  const address = formatAddress(patient)

  return (
    <div
      data-testid="selected-patient-preview"
      className="selected-patient-preview-card"
    >
      <div className="selected-patient-preview-header selected-patient-preview-header-summary">
        <div className="selected-patient-summary-left">
          <div className="selected-patient-avatar" aria-hidden="true">
            <UserOutlined />
          </div>
          <div className="selected-patient-summary-text">
            <Text strong className="selected-patient-summary-name">
              {summary?.name || `Patient/${subject.id}`}
            </Text>
            <Text type="secondary" className="selected-patient-summary-meta">
              ID: {summary?.id || subject.id} |{' '}
              {summary?.source === 'endpoint'
                ? 'From FHIR Server'
                : 'From FHIR Bundle'}
            </Text>
          </div>
        </div>

        <div className="selected-patient-header-controls">
          <span className="selected-patient-pill">Selected</span>
          <button
            type="button"
            className="selected-patient-clear-link"
            onClick={onClear}
            aria-label="Clear selected patient"
          >
            Clear
          </button>
          <button
            type="button"
            className="selected-patient-chevron-toggle"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label="Toggle selected patient details"
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <DownOutlined /> : <UpOutlined />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="selected-patient-preview-body">
          <div className="selected-patient-preview-header selected-patient-preview-header-actions">
            <div
              className="selected-patient-tabs"
              role="tablist"
              aria-label="Patient preview sections"
            >
              {[
                {
                  value: 'overview' as const,
                  label: 'Overview',
                  icon: <UserOutlined />,
                },
                {
                  value: 'medications' as const,
                  label: 'Medications',
                  icon: <MedicineBoxOutlined />,
                },
                {
                  value: 'conditions' as const,
                  label: 'Conditions',
                  icon: <HeartOutlined />,
                },
                {
                  value: 'observations' as const,
                  label: 'Observations',
                  icon: <LineChartOutlined />,
                },
                {
                  value: 'raw-json' as const,
                  label: 'Raw JSON',
                  icon: <FileTextOutlined />,
                },
              ].map((section) => {
                const isActive = activeSection === section.value
                return (
                  <button
                    key={section.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`selected-patient-tab ${
                      isActive ? 'selected-patient-tab-active' : ''
                    }`}
                    onClick={() => setActiveSection(section.value)}
                  >
                    <span className="selected-patient-tab-label">
                      {section.icon} {section.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {activeSection === 'overview' && (
            <div className="selected-patient-overview-grid">
              <div className="selected-patient-overview-item">
                <Text
                  type="secondary"
                  className="selected-patient-overview-label"
                >
                  Full Name
                </Text>
                <Text strong className="selected-patient-overview-value">
                  {fullName}
                </Text>
              </div>

              <div className="selected-patient-overview-item">
                <Text
                  type="secondary"
                  className="selected-patient-overview-label"
                >
                  Date of Birth
                </Text>
                <Text strong className="selected-patient-overview-value">
                  {summary?.dob ?? '—'}
                </Text>
              </div>

              <div className="selected-patient-overview-item">
                <Text
                  type="secondary"
                  className="selected-patient-overview-label"
                >
                  Gender
                </Text>
                <Text strong className="selected-patient-overview-value">
                  {summary?.gender ?? '—'}
                </Text>
              </div>

              <div className="selected-patient-overview-item">
                <Text
                  type="secondary"
                  className="selected-patient-overview-label"
                >
                  MRN
                </Text>
                <Text strong className="selected-patient-overview-value">
                  {mrn}
                </Text>
              </div>

              <div className="selected-patient-overview-item selected-patient-overview-item-full">
                <Text
                  type="secondary"
                  className="selected-patient-overview-label"
                >
                  Address
                </Text>
                <Text strong className="selected-patient-overview-value">
                  {address}
                </Text>
              </div>
            </div>
          )}

          {activeSection === 'medications' &&
            (medications.length === 0 ? (
              <Text type="secondary">{medicationsEmptyState}</Text>
            ) : (
              <div className="selected-patient-resource-list">
                {medications.map((item) => (
                  <div
                    key={`${item.resourceType}-${item.id}`}
                    className="selected-patient-resource-row"
                  >
                    {renderResourceProperties(item)}
                  </div>
                ))}
              </div>
            ))}

          {activeSection === 'conditions' &&
            (conditions.length === 0 ? (
              <Text type="secondary">{conditionsEmptyState}</Text>
            ) : (
              <div className="selected-patient-resource-list">
                {conditions.map((item) => (
                  <div key={item.id} className="selected-patient-resource-row">
                    {renderResourceProperties(item)}
                  </div>
                ))}
              </div>
            ))}

          {activeSection === 'observations' &&
            (observations.length === 0 ? (
              <Text type="secondary">{observationsEmptyState}</Text>
            ) : (
              <div className="selected-patient-resource-list">
                {observations.map((item) => (
                  <div key={item.id} className="selected-patient-resource-row">
                    {renderResourceProperties(item)}
                  </div>
                ))}
              </div>
            ))}

          {activeSection === 'raw-json' && (
            <pre className="selected-patient-raw-json">
              {rawFhirPayload == null
                ? 'No raw FHIR payload loaded.'
                : JSON.stringify(rawFhirPayload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default SelectedPatientPreviewCard
