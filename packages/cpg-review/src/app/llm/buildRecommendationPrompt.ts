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

type SupportedClinicalResource =
  | fhir4.Observation
  | fhir4.Condition
  | fhir4.MedicationStatement
  | fhir4.AllergyIntolerance

function isSupportedClinicalResource(resource: fhir4.FhirResource): resource is SupportedClinicalResource {
  return (
    resource.resourceType === 'Observation' ||
    resource.resourceType === 'Condition' ||
    resource.resourceType === 'MedicationStatement' ||
    resource.resourceType === 'AllergyIntolerance'
  )
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

  return resource.recordedDate ?? resource.onsetDateTime ?? resource.lastOccurrence ?? 'unknown'
}

function provenance(resource: SupportedClinicalResource): string {
  return `${resource.resourceType}/${resource.id ?? 'unknown'} @ ${firstDate(resource)}`
}

function normalizeClinicalResource(resource: SupportedClinicalResource): string {
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


function summarisePatient(patient: fhir4.Patient): string {
  const givenNames = patient.name?.[0]?.given?.join(' ') ?? ''
  const familyName = patient.name?.[0]?.family ?? ''
  const name = `${givenNames} ${familyName}`.trim() || 'Unknown'
  const gender = patient.gender ?? 'unknown'
  const birthDate = patient.birthDate ?? 'unknown'
  return `Patient: ${name}, gender: ${gender}, birthDate: ${birthDate}`
}

function summariseClinicalEntries(context: fhir4.Bundle): string[] {
  const entries = context.entry ?? []
  const summary: string[] = []

  for (const entry of entries) {
    const resource = entry.resource
    if (!resource) continue

    if (isSupportedClinicalResource(resource)) {
      summary.push(normalizeClinicalResource(resource))
    }
  }

  return summary
}

export function buildRecommendationPrompt(
  item: fhir4.QuestionnaireItem,
  context: fhir4.Bundle,
  questionnaire?: fhir4.Questionnaire
): string {
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

  const clinicalEntries = summariseClinicalEntries(context)
  const clinicalSummary =
    clinicalEntries.length > 0
      ? `Relevant normalized clinical entries:\n- ${clinicalEntries.join('\n- ')}`
      : 'Relevant clinical entries: none provided.'

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
    'Recommend one concise answer value or phrase that matches the item type and constraints.',
    'Respond ONLY as valid JSON with this exact shape and keys:',
    '{"recommendedAnswer":"string","rationale":"string","confidence":0.0}',
    'Use confidence as a number from 0.0 to 1.0.',
  ].join('\n\n')
}
