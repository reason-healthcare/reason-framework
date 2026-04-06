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
import {
  formatCodeableConcept,
  formatValue,
  formatProperty,
  notEmpty,
} from 'helpers'
import { PatientSummary, renderPatientName } from 'utils/recentPatientsStore'
import BrowserResolver from 'resolver/browser'

const { Text } = Typography

const META = ['id', 'text', 'meta']

interface SelectedPatientPreviewCardProps {
  subjectPayload: string | undefined
  dataPayload: string | undefined
  selectedPatient: PatientSummary | undefined
  resolver?: BrowserResolver | undefined
  onClear: () => void
}

interface DerivedContext {
  patient: fhir4.Patient | undefined
  medications: Array<fhir4.MedicationRequest | fhir4.MedicationStatement>
  conditions: fhir4.Condition[]
  observations: fhir4.Observation[]
  resolveResourceReference: (
    reference: string | undefined
  ) => fhir4.FhirResource | undefined
}

interface BundleResourceEntry {
  fullUrl?: string
  resource: fhir4.FhirResource
}

function parseBundle(dataPayload: unknown): fhir4.Bundle | undefined {
  if (dataPayload == null) return undefined
  if (typeof dataPayload === 'object') {
    const parsed = dataPayload as Partial<fhir4.Bundle>
    return parsed.resourceType === 'Bundle'
      ? (parsed as fhir4.Bundle)
      : undefined
  }
  if (typeof dataPayload !== 'string' || !dataPayload.trim()) return undefined
  try {
    const parsed = JSON.parse(dataPayload) as fhir4.Bundle
    return parsed.resourceType === 'Bundle' ? parsed : undefined
  } catch {
    return undefined
  }
}

function parseRawJson(dataPayload: unknown): unknown {
  if (dataPayload == null) return undefined
  if (typeof dataPayload !== 'string') return dataPayload
  if (!dataPayload.trim()) return undefined
  try {
    return JSON.parse(dataPayload)
  } catch {
    return dataPayload
  }
}

function normalizeIdentifierUse(
  use: fhir4.Identifier['use'] | undefined
): number {
  if (use === 'usual') return 0
  if (use === 'official') return 1
  if (use === 'secondary') return 2
  return 3
}

function isMrnIdentifier(identifier: fhir4.Identifier): boolean {
  const typeText = identifier.type?.text?.toLowerCase()
  const systemText = identifier.system?.toLowerCase()

  const codingMatches =
    identifier.type?.coding?.some((coding) => {
      const system = coding.system?.toLowerCase()
      const code = coding.code?.toLowerCase()
      const display = coding.display?.toLowerCase()

      const isV2MrCode =
        system === 'http://terminology.hl7.org/codesystem/v2-0203' &&
        code === 'mr'

      return (
        isV2MrCode ||
        code === 'mr' ||
        code === 'mrn' ||
        display?.includes('medical record') === true ||
        display?.includes('mrn') === true
      )
    }) ?? false

  return (
    codingMatches ||
    typeText?.includes('medical record') === true ||
    typeText?.includes('mrn') === true ||
    systemText?.includes('mrn') === true
  )
}

function mrnValue(
  patient: fhir4.Patient | undefined,
  summary: PatientSummary | undefined,
  patientId: string | undefined
): string {
  const identifiers = patient?.identifier ?? []

  const mrnIdentifiers = identifiers
    .filter((identifier) => !!identifier.value && isMrnIdentifier(identifier))
    .sort(
      (left, right) =>
        normalizeIdentifierUse(left.use) - normalizeIdentifierUse(right.use)
    )

  const identifier = mrnIdentifiers[0]

  return identifier?.value || '—'
}

function formatAddress(patient: fhir4.Patient | undefined): string {
  const addresses = patient?.address ?? []
  const address =
    addresses.find((entry) => entry.use === 'home') ??
    addresses.find((entry) => entry.use === 'temp') ??
    addresses[0]

  if (!address) return '—'
  if (address.text?.trim()) return address.text.trim()

  const line = address.line?.filter(Boolean).join(', ')
  const locality = [address.city, address.district, address.state]
    .filter(Boolean)
    .join(', ')
  const postalAndCountry = [address.postalCode, address.country]
    .filter(Boolean)
    .join(' ')

  return [line, locality, postalAndCountry].filter(Boolean).join(', ') || '—'
}

function getPatientId(subjectPayload: string | undefined): string | undefined {
  if (!subjectPayload?.trim()) return undefined
  const match = subjectPayload.trim().match(/^Patient\/(.+)$/)
  return match?.[1]
}

function stripHistorySuffix(reference: string): string {
  return reference.replace(/\/_history\/[^/]+$/, '')
}

function referenceAliases(reference: string | undefined): string[] {
  if (!reference?.trim()) return []

  const raw = stripHistorySuffix(reference.trim())
  const aliases = new Set<string>([raw])

  const relativeMatch = raw.match(/^([A-Za-z]+)\/([^/]+)$/)
  if (relativeMatch) {
    aliases.add(`${relativeMatch[1]}/${relativeMatch[2]}`)
    aliases.add(relativeMatch[2])
  }

  const patientAbsoluteMatch = raw.match(/\/Patient\/([^/?#]+)/)
  if (patientAbsoluteMatch) {
    aliases.add(`Patient/${patientAbsoluteMatch[1]}`)
    aliases.add(patientAbsoluteMatch[1])
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw)
      const trimmedPath = stripHistorySuffix(parsed.pathname)
      const pathParts = trimmedPath.split('/').filter(Boolean)
      if (pathParts.length >= 2) {
        const resourceType = pathParts[pathParts.length - 2]
        const resourceId = pathParts[pathParts.length - 1]
        aliases.add(`${resourceType}/${resourceId}`)
        aliases.add(resourceId)
      }
    } catch {
      // ignore invalid URL formatting
    }
  }

  return Array.from(aliases)
}

function createResourceResolver(entries: BundleResourceEntry[]) {
  const lookup = new Map<string, fhir4.FhirResource>()

  for (const entry of entries) {
    const resource = entry.resource
    const resourceKey =
      resource.id != null
        ? `${resource.resourceType}/${resource.id}`
        : undefined

    if (resourceKey) {
      for (const alias of referenceAliases(resourceKey)) {
        lookup.set(alias, resource)
      }
    }

    if (entry.fullUrl) {
      for (const alias of referenceAliases(entry.fullUrl)) {
        lookup.set(alias, resource)
      }
    }
  }

  return (reference: string | undefined): fhir4.FhirResource | undefined => {
    for (const alias of referenceAliases(reference)) {
      const match = lookup.get(alias)
      if (match) {
        return match
      }
    }
    return undefined
  }
}

function narrativeText(
  resource: fhir4.DomainResource | undefined
): string | undefined {
  const div = resource?.text?.div
  if (!div) return undefined
  return div
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPatientReferenceSet(
  subjectPayload: string | undefined,
  patientId: string | undefined,
  entries: BundleResourceEntry[]
): Set<string> {
  const patientReferenceSet = new Set<string>()

  for (const alias of referenceAliases(subjectPayload)) {
    patientReferenceSet.add(alias)
  }

  if (patientId) {
    for (const alias of referenceAliases(`Patient/${patientId}`)) {
      patientReferenceSet.add(alias)
    }
  }

  const patientEntry = entries.find((entry) => {
    if (entry.resource.resourceType !== 'Patient') return false
    const id = entry.resource.id
    if (patientId && id === patientId) return true
    if (subjectPayload) {
      return referenceAliases(subjectPayload).some((alias) =>
        referenceAliases(entry.fullUrl ?? '').includes(alias)
      )
    }
    return false
  })

  if (patientEntry?.resource.id) {
    for (const alias of referenceAliases(
      `${patientEntry.resource.resourceType}/${patientEntry.resource.id}`
    )) {
      patientReferenceSet.add(alias)
    }
  }

  if (patientEntry?.fullUrl) {
    for (const alias of referenceAliases(patientEntry.fullUrl)) {
      patientReferenceSet.add(alias)
    }
  }

  return patientReferenceSet
}

function matchesSubjectReference(
  reference: fhir4.Reference | undefined,
  patientReferenceSet: Set<string>
): boolean {
  return referenceAliases(reference?.reference).some((alias) =>
    patientReferenceSet.has(alias)
  )
}

function deriveContext(
  bundle: fhir4.Bundle | undefined,
  subjectPayload: string | undefined,
  patientId: string | undefined
): DerivedContext {
  const entries: BundleResourceEntry[] =
    bundle?.entry
      ?.filter(
        (
          entry
        ): entry is {
          fullUrl?: string
          resource: fhir4.FhirResource
        } => entry.resource != null
      )
      .map((entry) => ({
        fullUrl: entry.fullUrl,
        resource: entry.resource,
      })) ?? []

  const resources = entries.map((entry) => entry.resource)
  const resolveResourceReference = createResourceResolver(entries)
  const patientReferenceSet = buildPatientReferenceSet(
    subjectPayload,
    patientId,
    entries
  )

  const patient = resources.find(
    (resource): resource is fhir4.Patient =>
      resource?.resourceType === 'Patient' &&
      (!!patientId ? resource.id === patientId : true)
  )

  const medications = resources.filter(
    (
      resource
    ): resource is fhir4.MedicationRequest | fhir4.MedicationStatement => {
      if (resource?.resourceType === 'MedicationRequest') {
        return matchesSubjectReference(resource.subject, patientReferenceSet)
      }
      if (resource?.resourceType === 'MedicationStatement') {
        return matchesSubjectReference(resource.subject, patientReferenceSet)
      }
      return false
    }
  )

  const conditions = resources.filter(
    (resource): resource is fhir4.Condition =>
      resource?.resourceType === 'Condition' &&
      matchesSubjectReference(resource.subject, patientReferenceSet)
  )

  const observations = resources.filter(
    (resource): resource is fhir4.Observation =>
      resource?.resourceType === 'Observation' &&
      matchesSubjectReference(resource.subject, patientReferenceSet)
  )

  return {
    patient,
    medications,
    conditions,
    observations,
    resolveResourceReference,
  }
}

function renderResourceProperties(
  resource: fhir4.FhirResource,
  resolver?: BrowserResolver
) {
  return Object.entries(resource)
    .map(([key, value]) => {
      if (!META.includes(key)) {
        return formatProperty(value, resolver, undefined, key, false)
      }
    })
    .filter(notEmpty)
}

const SelectedPatientPreviewCard = ({
  subjectPayload,
  dataPayload,
  selectedPatient,
  resolver,
  onClear,
}: SelectedPatientPreviewCardProps) => {
  if (!subjectPayload?.trim()) return null

  const patientId = getPatientId(subjectPayload)
  const bundle = parseBundle(dataPayload)
  const {
    patient,
    medications,
    conditions,
    observations,
    resolveResourceReference,
  } = deriveContext(bundle, subjectPayload, patientId)

  const fallbackSummary: PatientSummary | undefined = patient
    ? {
        id: patient.id ?? patientId ?? 'unknown',
        name: renderPatientName(patient.name),
        dob: patient.birthDate,
        gender: patient.gender,
        source: 'package',
        addedAt: new Date(0).toISOString(),
      }
    : undefined

  const summary = selectedPatient ?? fallbackSummary
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeSection, setActiveSection] = useState<
    'overview' | 'medications' | 'conditions' | 'observations' | 'raw-json'
  >('overview')
  const rawFhirPayload = parseRawJson(dataPayload)
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
  const fullName = summary?.name || `Patient/${patientId ?? '—'}`
  const mrn = mrnValue(patient, summary, patientId)
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
              {summary?.name || `Patient/${patientId ?? '—'}`}
            </Text>
            <Text type="secondary" className="selected-patient-summary-meta">
              ID: {summary?.bundleId || summary?.id || patientId || '—'} |{' '}
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
                    {renderResourceProperties(item, resolver)}
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
                    {renderResourceProperties(item, resolver)}
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
                    {renderResourceProperties(item, resolver)}
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
