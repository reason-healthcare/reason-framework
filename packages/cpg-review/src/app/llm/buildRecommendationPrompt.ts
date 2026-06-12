import { decodeDocumentAttachmentText } from './documentReferenceExtraction'

function getAnswerOptionLabel(option: fhir4.QuestionnaireItemAnswerOption): string {
  if (option.valueCoding) {
    return option.valueCoding.display ?? option.valueCoding.code ?? 'coded option'
  }
  if (option.valueString) return option.valueString
  if (option.valueInteger !== undefined) return String(option.valueInteger)
  if (option.valueDate) return option.valueDate
  if (option.valueTime) return option.valueTime
  if (option.valueReference?.reference) return option.valueReference.reference
  return 'option'
}

const RAW_EXCERPTS_ENABLED = process.env.LLM_PROMPT_INCLUDE_RAW_EXCERPTS === 'true'
const DEFAULT_MAX_RAW_EXCERPT_CHARS = 1200
const DEFAULT_MAX_RAW_EXCERPT_ENTRIES = 3
const DEFAULT_MAX_ADDITIONAL_SUMMARY_ENTRIES = 8

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

const MAX_RAW_EXCERPT_CHARS = parsePositiveInt(
  process.env.LLM_PROMPT_RAW_EXCERPT_MAX_CHARS,
  DEFAULT_MAX_RAW_EXCERPT_CHARS
)
const MAX_RAW_EXCERPT_ENTRIES = parsePositiveInt(
  process.env.LLM_PROMPT_RAW_EXCERPT_MAX_ENTRIES,
  DEFAULT_MAX_RAW_EXCERPT_ENTRIES
)
const MAX_ADDITIONAL_SUMMARY_ENTRIES = parsePositiveInt(
  process.env.LLM_PROMPT_MAX_ADDITIONAL_SUMMARY_ENTRIES,
  DEFAULT_MAX_ADDITIONAL_SUMMARY_ENTRIES
)

type SupportedClinicalResource =
  | fhir4.Observation
  | fhir4.Condition
  | fhir4.MedicationStatement
  | fhir4.AllergyIntolerance
  | fhir4.DocumentReference
  | fhir4.DiagnosticReport
  | fhir4.Procedure
  | fhir4.Encounter
  | fhir4.MedicationRequest
  | fhir4.ServiceRequest
  | fhir4.Immunization

function isSupportedClinicalResource(resource: fhir4.FhirResource): resource is SupportedClinicalResource {
  return (
    resource.resourceType === 'Observation' ||
    resource.resourceType === 'Condition' ||
    resource.resourceType === 'MedicationStatement' ||
    resource.resourceType === 'AllergyIntolerance' ||
    resource.resourceType === 'DocumentReference' ||
    resource.resourceType === 'DiagnosticReport' ||
    resource.resourceType === 'Procedure' ||
    resource.resourceType === 'Encounter' ||
    resource.resourceType === 'MedicationRequest' ||
    resource.resourceType === 'ServiceRequest' ||
    resource.resourceType === 'Immunization'
  )
}

const ADDITIONAL_RESOURCE_TYPE_EXCLUSIONS = new Set([
  'Patient',
  'Practitioner',
  'PractitionerRole',
  'Organization',
  'Location',
  'RelatedPerson',
  'Coverage',
  'Provenance',
  'AuditEvent',
  'Composition',
  'Bundle',
  'Endpoint',
])

function shouldIncludeAdditionalResource(resource: fhir4.FhirResource): boolean {
  return !isSupportedClinicalResource(resource) && !ADDITIONAL_RESOURCE_TYPE_EXCLUSIONS.has(resource.resourceType)
}

function firstCodingLabel(
  codeableConcept?: fhir4.CodeableConcept,
  fallback = 'unknown'
): string {
  return codeableConcept?.text ?? codeableConcept?.coding?.[0]?.display ?? codeableConcept?.coding?.[0]?.code ?? fallback
}

function codingListLabel(codeableConcept?: fhir4.CodeableConcept, fallback = 'unknown'): string {
  const labels =
    codeableConcept?.coding
      ?.map((coding) => coding.display ?? coding.code)
      .filter((value): value is string => Boolean(value)) ?? []

  if (labels.length > 0) {
    return labels.join(', ')
  }

  return codeableConcept?.text ?? fallback
}

function valueSummary(observation: fhir4.Observation): string {
  if (observation.valueQuantity?.value !== undefined) {
    const unit = observation.valueQuantity.unit ?? observation.valueQuantity.code ?? ''
    return unit
      ? `${observation.valueQuantity.value} ${unit}`
      : `${observation.valueQuantity.value}`
  }
  if (observation.valueString) return observation.valueString
  if (observation.valueCodeableConcept) {
    return firstCodingLabel(observation.valueCodeableConcept)
  }
  if (observation.valueInteger !== undefined) return `${observation.valueInteger}`
  if (observation.valueBoolean !== undefined) return `${observation.valueBoolean}`
  if (observation.valueDateTime) return observation.valueDateTime
  return 'not recorded'
}

function onsetSummary(condition: fhir4.Condition): string {
  if (condition.onsetDateTime) return condition.onsetDateTime
  if (condition.onsetString) return condition.onsetString
  if (condition.onsetAge?.value !== undefined) {
    const unit = condition.onsetAge.unit ?? condition.onsetAge.code ?? ''
    return unit ? `${condition.onsetAge.value} ${unit}` : `${condition.onsetAge.value}`
  }
  return 'unknown'
}

function effectivePeriodSummary(period?: fhir4.Period): string {
  if (!period?.start && !period?.end) return 'unknown'
  return `${period.start ?? 'unknown'} to ${period.end ?? 'unknown'}`
}

function firstDate(resource: SupportedClinicalResource): string {
  if (resource.resourceType === 'Observation') {
    return resource.effectiveDateTime ?? resource.issued ?? 'unknown'
  }

  if (resource.resourceType === 'Condition') {
    return resource.recordedDate ?? resource.onsetDateTime ?? 'unknown'
  }

  if (resource.resourceType === 'MedicationStatement') {
    return resource.effectiveDateTime ?? resource.effectivePeriod?.start ?? resource.dateAsserted ?? 'unknown'
  }

  if (resource.resourceType === 'DocumentReference') {
    return resource.date ?? resource.content?.[0]?.attachment?.creation ?? 'unknown'
  }

  if (resource.resourceType === 'DiagnosticReport') {
    return resource.effectiveDateTime ?? resource.issued ?? 'unknown'
  }

  if (resource.resourceType === 'Procedure') {
    return resource.performedDateTime ?? resource.performedPeriod?.start ?? 'unknown'
  }

  if (resource.resourceType === 'Encounter') {
    return resource.period?.start ?? 'unknown'
  }

  if (resource.resourceType === 'MedicationRequest') {
    return resource.authoredOn ?? 'unknown'
  }

  if (resource.resourceType === 'ServiceRequest') {
    return resource.authoredOn ?? resource.occurrenceDateTime ?? 'unknown'
  }

  if (resource.resourceType === 'Immunization') {
    return resource.occurrenceDateTime ?? resource.recorded ?? 'unknown'
  }

  return resource.recordedDate ?? resource.onsetDateTime ?? resource.lastOccurrence ?? 'unknown'
}

function provenance(resource: SupportedClinicalResource): string {
  return `${resource.resourceType}/${resource.id ?? 'unknown'} @ ${firstDate(resource)}`
}

async function normalizeClinicalResource(resource: SupportedClinicalResource): Promise<string> {
  if (resource.resourceType === 'Observation') {
    const code = firstCodingLabel(resource.code)
    const interpretation = resource.interpretation?.map((concept) => codingListLabel(concept)).join(', ') ?? 'none'
    return [
      'Observation',
      `code=${code}`,
      `value=${valueSummary(resource)}`,
      `effective=${resource.effectiveDateTime ?? 'unknown'}`,
      `interpretation=${interpretation}`,
      `status=${resource.status ?? 'unknown'}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'Condition') {
    return [
      'Condition',
      `code=${firstCodingLabel(resource.code)}`,
      `clinicalStatus=${codingListLabel(resource.clinicalStatus)}`,
      `verificationStatus=${codingListLabel(resource.verificationStatus)}`,
      `onset=${onsetSummary(resource)}`,
      `severity=${firstCodingLabel(resource.severity)}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'MedicationStatement') {
    return [
      'MedicationStatement',
      `medication=${firstCodingLabel(resource.medicationCodeableConcept)}`,
      `status=${resource.status ?? 'unknown'}`,
      `dosage=${resource.dosage?.[0]?.text ?? 'unknown'}`,
      `effectivePeriod=${effectivePeriodSummary(resource.effectivePeriod)}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'DocumentReference') {
    const firstAttachment = resource.content?.[0]?.attachment
    const attachmentTextExcerpt = await decodeDocumentAttachmentText(firstAttachment)
    return [
      'DocumentReference',
      `type=${firstCodingLabel(resource.type, 'unknown')}`,
      `category=${resource.category?.map((concept) => codingListLabel(concept)).join(', ') ?? 'none'}`,
      `status=${resource.status ?? 'unknown'}`,
      `docStatus=${resource.docStatus ?? 'unknown'}`,
      `description=${resource.description ?? 'none'}`,
      `attachmentTitle=${firstAttachment?.title ?? 'unknown'}`,
      `attachmentMime=${firstAttachment?.contentType ?? 'unknown'}`,
      `attachmentUrl=${firstAttachment?.url ?? 'none'}`,
      `attachmentTextExcerpt=${attachmentTextExcerpt}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'DiagnosticReport') {
    return [
      'DiagnosticReport',
      `code=${firstCodingLabel(resource.code)}`,
      `status=${resource.status ?? 'unknown'}`,
      `category=${resource.category?.map((concept) => codingListLabel(concept)).join(', ') ?? 'none'}`,
      `effective=${resource.effectiveDateTime ?? effectivePeriodSummary(resource.effectivePeriod)}`,
      `conclusion=${resource.conclusion ?? 'none'}`,
      `resultCount=${resource.result?.length ?? 0}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'Procedure') {
    return [
      'Procedure',
      `code=${firstCodingLabel(resource.code)}`,
      `status=${resource.status ?? 'unknown'}`,
      `performed=${resource.performedDateTime ?? effectivePeriodSummary(resource.performedPeriod)}`,
      `outcome=${firstCodingLabel(resource.outcome, 'none')}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'Encounter') {
    return [
      'Encounter',
      `status=${resource.status ?? 'unknown'}`,
      `class=${resource.class?.display ?? resource.class?.code ?? 'unknown'}`,
      `type=${resource.type?.map((concept) => codingListLabel(concept)).join(', ') ?? 'none'}`,
      `period=${effectivePeriodSummary(resource.period)}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'MedicationRequest') {
    return [
      'MedicationRequest',
      `medication=${firstCodingLabel(resource.medicationCodeableConcept)}`,
      `status=${resource.status ?? 'unknown'}`,
      `intent=${resource.intent ?? 'unknown'}`,
      `authoredOn=${resource.authoredOn ?? 'unknown'}`,
      `dosage=${resource.dosageInstruction?.[0]?.text ?? 'unknown'}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'ServiceRequest') {
    return [
      'ServiceRequest',
      `code=${firstCodingLabel(resource.code)}`,
      `status=${resource.status ?? 'unknown'}`,
      `intent=${resource.intent ?? 'unknown'}`,
      `authoredOn=${resource.authoredOn ?? 'unknown'}`,
      `occurrence=${resource.occurrenceDateTime ?? 'unknown'}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  if (resource.resourceType === 'Immunization') {
    return [
      'Immunization',
      `vaccine=${firstCodingLabel(resource.vaccineCode)}`,
      `status=${resource.status ?? 'unknown'}`,
      `occurrence=${resource.occurrenceDateTime ?? 'unknown'}`,
      `primarySource=${resource.primarySource ?? 'unknown'}`,
      `provenance=${provenance(resource)}`,
    ].join(' | ')
  }

  const manifestations =
    resource.reaction
      ?.flatMap((reaction) =>
        reaction.manifestation
          ?.map((concept) => firstCodingLabel(concept))
          .filter((value): value is string => Boolean(value)) ?? []
      )
      .join(', ') ?? 'none'

  return [
    'AllergyIntolerance',
    `substance=${firstCodingLabel(resource.code)}`,
    `criticality=${resource.criticality ?? 'unknown'}`,
    `reactionManifestations=${manifestations}`,
    `provenance=${provenance(resource)}`,
  ].join(' | ')
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}...(truncated)`
}

function normalizeAdditionalResource(resource: fhir4.FhirResource): string {
  const generic = resource as {
    status?: string
    code?: fhir4.CodeableConcept
    category?: fhir4.CodeableConcept[]
    effectiveDateTime?: string
    occurrenceDateTime?: string
    authoredOn?: string
    recordedDate?: string
  }

  const category = generic.category?.map((concept) => codingListLabel(concept)).join(', ') ?? 'none'
  const date =
    generic.effectiveDateTime ??
    generic.occurrenceDateTime ??
    generic.authoredOn ??
    generic.recordedDate ??
    'unknown'

  return [
    `${resource.resourceType}`,
    `id=${resource.id ?? 'unknown'}`,
    `status=${generic.status ?? 'unknown'}`,
    `code=${firstCodingLabel(generic.code, 'unknown')}`,
    `category=${category}`,
    `date=${date}`,
  ].join(' | ')
}

function buildRawExcerpts(resources: fhir4.FhirResource[]): string | undefined {
  if (!RAW_EXCERPTS_ENABLED || resources.length === 0) return undefined

  const lines = resources.slice(0, MAX_RAW_EXCERPT_ENTRIES).map((resource) => {
    const generic = resource as {
      status?: string
      code?: fhir4.CodeableConcept
      category?: fhir4.CodeableConcept[]
      effectiveDateTime?: string
      authoredOn?: string
      occurrenceDateTime?: string
      recordedDate?: string
      text?: { div?: string }
    }

    const excerpt = {
      resourceType: resource.resourceType,
      id: resource.id,
      status: generic.status,
      code: generic.code,
      category: generic.category,
      effectiveDateTime: generic.effectiveDateTime,
      authoredOn: generic.authoredOn,
      occurrenceDateTime: generic.occurrenceDateTime,
      recordedDate: generic.recordedDate,
      narrative: generic.text?.div ? truncate(generic.text.div, 300) : undefined,
    }

    const serialized = JSON.stringify(excerpt)
    return `- ${truncate(serialized, MAX_RAW_EXCERPT_CHARS)}`
  })

  return [
    'Additional raw excerpts for uncommon resource types (truncated JSON):',
    ...lines,
  ].join('\n')
}


function summarisePatient(patient: fhir4.Patient): string {
  const givenNames = patient.name?.[0]?.given?.join(' ') ?? ''
  const familyName = patient.name?.[0]?.family ?? ''
  const name = `${givenNames} ${familyName}`.trim() || 'Unknown'
  const gender = patient.gender ?? 'unknown'
  const birthDate = patient.birthDate ?? 'unknown'
  return `Patient: ${name}, gender: ${gender}, birthDate: ${birthDate}`
}

async function summariseClinicalEntries(context: fhir4.Bundle): Promise<string[]> {
  const entries = context.entry ?? []
  const summary: string[] = []

  for (const entry of entries) {
    const resource = entry.resource
    if (!resource) continue

    if (isSupportedClinicalResource(resource)) {
      summary.push(await normalizeClinicalResource(resource))
    }
  }

  return summary
}

function summariseAdditionalEntries(context: fhir4.Bundle): fhir4.FhirResource[] {
  const entries = context.entry ?? []
  return entries
    .map((entry) => entry.resource)
    .filter((resource): resource is fhir4.FhirResource => Boolean(resource))
    .filter(shouldIncludeAdditionalResource)
}

export async function buildRecommendationPrompt(
  item: fhir4.QuestionnaireItem,
  context: fhir4.Bundle,
  questionnaire?: fhir4.Questionnaire
): Promise<string> {
  const itemText = item.text ?? 'Unknown questionnaire item'
  const linkId = item.linkId
  const itemType = item.type
  const questionnaireTitle = questionnaire?.title

  const answerOptions = item.answerOption?.map(getAnswerOptionLabel) ?? []
  const answerOptionsBlock =
    answerOptions.length > 0
      ? `Allowed answer options:\n- ${answerOptions.join('\n- ')}`
      : 'No fixed answer options are provided. Return concise free text appropriate for the item type.'

  const entries = context.entry ?? []
  const patient = entries.find((entry) => entry.resource?.resourceType === 'Patient')?.resource as
    | fhir4.Patient
    | undefined
  const patientSummary = patient
    ? summarisePatient(patient)
    : 'Patient demographics: not available in the provided context bundle.'

  const clinicalEntries = await summariseClinicalEntries(context)
  const clinicalSummary =
    clinicalEntries.length > 0
      ? `Relevant normalized clinical entries:\n- ${clinicalEntries.join('\n- ')}`
      : 'Relevant clinical entries: none provided.'

  const additionalEntries = summariseAdditionalEntries(context)
  const additionalSummaries = additionalEntries
    .slice(0, MAX_ADDITIONAL_SUMMARY_ENTRIES)
    .map(normalizeAdditionalResource)
  const additionalSummaryBlock =
    additionalSummaries.length > 0
      ? `Additional potentially relevant entries:\n- ${additionalSummaries.join('\n- ')}`
      : undefined
  const additionalSummaryOverflow =
    additionalEntries.length > MAX_ADDITIONAL_SUMMARY_ENTRIES
      ? `Additional entries omitted for brevity: ${additionalEntries.length - MAX_ADDITIONAL_SUMMARY_ENTRIES}.`
      : undefined
  const rawExcerpts = buildRawExcerpts(additionalEntries)

  const questionnaireContext = questionnaireTitle
    ? `Questionnaire title: ${questionnaireTitle}`
    : 'Questionnaire title: not provided.'

  return [
    'You are a clinical decision support assistant.',
    questionnaireContext,
    `Questionnaire item linkId: ${linkId}`,
    `Questionnaire item text: ${itemText}`,
    `Questionnaire item type: ${itemType}`,
    answerOptionsBlock,
    patientSummary,
    clinicalSummary,
    additionalSummaryBlock,
    additionalSummaryOverflow,
    rawExcerpts,
    'Recommend one concise answer value or phrase that matches the item type and constraints.',
    'Respond ONLY as valid JSON with this exact shape and keys:',
    '{"recommendedAnswer":"string","rationale":"string","confidence":"high|medium|low"}',
    'Use confidence as one of: "high", "medium", or "low".',
    'Use "high" only when the provided context directly and unambiguously supports the answer with no meaningful uncertainty.',
    'Prefer "medium" or "low" when evidence is sparse, indirect, conflicting, outdated, or inferred.',
  ]
    .filter((section): section is string => Boolean(section))
    .join('\n\n')
}
