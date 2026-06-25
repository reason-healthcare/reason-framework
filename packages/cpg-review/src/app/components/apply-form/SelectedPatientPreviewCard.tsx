import {
  DownOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  HeartOutlined,
  LineChartOutlined,
  MedicineBoxOutlined,
  ReadOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Modal, Typography } from 'antd'
import type { ReactNode } from 'react'
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
type SectionValue =
  | 'overview'
  | 'medications'
  | 'conditions'
  | 'observations'
  | 'diagnostic-reports'
  | 'documents'
  | 'raw-json'

function codeableText(codeableConcept?: fhir4.CodeableConcept): string {
  return (
    codeableConcept?.text ??
    codeableConcept?.coding?.[0]?.display ??
    codeableConcept?.coding?.[0]?.code ??
    'Unknown'
  )
}

function toDateLabel(value?: string): string {
  if (!value) return 'Unknown'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

function decodeBase64ToText(base64Data: string): string | undefined {
  try {
    if (typeof atob !== 'function') return undefined
    return atob(base64Data)
  } catch {
    return undefined
  }
}

function isTextLikeMime(mimeType: string): boolean {
  const lower = mimeType.toLowerCase()
  return (
    lower.startsWith('text/') ||
    lower === 'application/json' ||
    lower === 'application/xml' ||
    lower === 'application/fhir+json' ||
    lower === 'application/fhir+xml'
  )
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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
  const {
    patient,
    medications,
    conditions,
    observations,
    diagnosticReports,
    documentReferences,
  } = deriveContext(bundle, subject)

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
  const [activeSection, setActiveSection] = useState<SectionValue>('overview')
  const [activeDocumentIndex, setActiveDocumentIndex] = useState(0)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
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

  const reportsEmptyState = isEndpointSelected
    ? 'Diagnostic report data is not loaded for endpoint-selected patients in this selection.'
    : 'No diagnostic reports available for this patient context.'

  const documentsEmptyState = isEndpointSelected
    ? 'Document references are not loaded for endpoint-selected patients in this selection.'
    : 'No document references available for this patient context.'

  const activeDocument =
    documentReferences.length > 0
      ? documentReferences[
          Math.min(activeDocumentIndex, documentReferences.length - 1)
        ]
      : undefined
  const activeAttachment = activeDocument?.content?.[0]?.attachment
  const activeMimeType = activeAttachment?.contentType ?? ''
  const decodedDocumentText = activeAttachment?.data
    ? decodeBase64ToText(activeAttachment.data)
    : undefined
  const documentDataUrl =
    activeAttachment?.data && activeMimeType
      ? `data:${activeMimeType};base64,${activeAttachment.data}`
      : undefined
  const canRenderPdf = activeMimeType.toLowerCase() === 'application/pdf'
  const canRenderText = Boolean(
    decodedDocumentText && isTextLikeMime(activeMimeType)
  )
  const canRenderHtml = Boolean(
    decodedDocumentText && activeMimeType.toLowerCase().includes('html')
  )
  const fullName = summary?.name || `Patient/${subject.id}`
  const mrn = mrnValue(patient)
  const address = formatAddress(patient)
  const sections: {
    value: SectionValue
    label: string
    icon: ReactNode
    count?: number
  }[] = [
    {
      value: 'overview',
      label: 'Overview',
      icon: <UserOutlined />,
    },
    {
      value: 'medications',
      label: 'Medications',
      icon: <MedicineBoxOutlined />,
      count: medications.length,
    },
    {
      value: 'conditions',
      label: 'Conditions',
      icon: <HeartOutlined />,
      count: conditions.length,
    },
    {
      value: 'observations',
      label: 'Observations',
      icon: <LineChartOutlined />,
      count: observations.length,
    },
    {
      value: 'diagnostic-reports',
      label: 'Diagnostic Reports',
      icon: <FileSearchOutlined />,
      count: diagnosticReports.length,
    },
    {
      value: 'documents',
      label: 'Documents',
      icon: <ReadOutlined />,
      count: documentReferences.length,
    },
    {
      value: 'raw-json',
      label: 'Raw JSON',
      icon: <FileTextOutlined />,
    },
  ]

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
              {sections.map((section) => {
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
                    onClick={() => {
                      setActiveSection(section.value)
                      if (section.value === 'documents') {
                        setActiveDocumentIndex(0)
                      }
                    }}
                  >
                    <span className="selected-patient-tab-label">
                      {section.icon}
                      <span>{section.label}</span>
                      {section.count != null && (
                        <span
                          className="selected-patient-tab-count"
                          aria-label={`${section.count} resources`}
                        >
                          {section.count}
                        </span>
                      )}
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

          {activeSection === 'diagnostic-reports' &&
            (diagnosticReports.length === 0 ? (
              <Text type="secondary">{reportsEmptyState}</Text>
            ) : (
              <div className="selected-patient-resource-list">
                {diagnosticReports.map((report) => (
                  <div
                    key={
                      report.id ??
                      report.identifier?.[0]?.value ??
                      report.code?.text ??
                      'diagnostic-report'
                    }
                    className="selected-patient-resource-row"
                  >
                    {renderResourceProperties(report)}
                  </div>
                ))}
              </div>
            ))}

          {activeSection === 'documents' &&
            (documentReferences.length === 0 ? (
              <Text type="secondary">{documentsEmptyState}</Text>
            ) : (
              <div className="selected-patient-document-layout">
                <div
                  className="selected-patient-document-list"
                  role="tablist"
                  aria-label="Document references"
                >
                  {documentReferences.map((doc, index) => {
                    const isActive = index === activeDocumentIndex
                    const attachment = doc.content?.[0]?.attachment
                    return (
                      <button
                        key={doc.id ?? `${index}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`selected-patient-document-item ${
                          isActive
                            ? 'selected-patient-document-item-active'
                            : ''
                        }`}
                        onClick={() => {
                          setActiveDocumentIndex(index)
                          setIsDocumentModalOpen(true)
                        }}
                      >
                        <Text strong>
                          {doc.description ?? codeableText(doc.type)}
                        </Text>
                        <Text type="secondary">
                          {toDateLabel(doc.date ?? attachment?.creation)}
                        </Text>
                        <Text type="secondary">
                          {attachment?.contentType ?? 'unknown mime'}
                        </Text>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

          {activeSection === 'raw-json' && (
            <pre className="selected-patient-raw-json">
              {rawFhirPayload == null
                ? 'No raw FHIR payload loaded.'
                : JSON.stringify(rawFhirPayload, null, 2)}
            </pre>
          )}

          <Modal
            title={
              activeDocument?.description ?? codeableText(activeDocument?.type)
            }
            open={isDocumentModalOpen}
            onCancel={() => setIsDocumentModalOpen(false)}
            footer={null}
            width={960}
            destroyOnHidden
          >
            <div className="selected-patient-document-viewer selected-patient-document-modal-viewer">
              <Text type="secondary">
                {activeAttachment?.title ??
                  activeAttachment?.url ??
                  'No attachment metadata'}
              </Text>

              {canRenderPdf && documentDataUrl && (
                <iframe
                  title="Document PDF preview"
                  src={documentDataUrl}
                  className="selected-patient-document-frame"
                />
              )}

              {canRenderHtml && decodedDocumentText && (
                <iframe
                  title="Document HTML preview"
                  srcDoc={decodedDocumentText}
                  className="selected-patient-document-frame"
                />
              )}

              {canRenderText && decodedDocumentText && !canRenderHtml && (
                <pre className="selected-patient-document-text">
                  {decodedDocumentText}
                </pre>
              )}

              {!canRenderPdf &&
                !canRenderHtml &&
                !canRenderText &&
                activeAttachment?.url && (
                  <a
                    href={activeAttachment.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open attachment URL
                  </a>
                )}

              {!canRenderPdf &&
                !canRenderHtml &&
                !canRenderText &&
                !activeAttachment?.url && (
                  <Text type="secondary">
                    No inline preview available for this attachment.
                  </Text>
                )}
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}

export default SelectedPatientPreviewCard
