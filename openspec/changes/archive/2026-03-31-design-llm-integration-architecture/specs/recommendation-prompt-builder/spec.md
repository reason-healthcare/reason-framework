## ADDED Requirements

### Requirement: Prompt builder maps questionnaire item and patient context to a prompt string
The system SHALL provide a pure function `buildRecommendationPrompt(item: fhir4.QuestionnaireItem, context: fhir4.Bundle, questionnaire?: fhir4.Questionnaire): string`.

The produced prompt SHALL:
- Identify the questionnaire item by its `text` and `linkId`.
- Include any `answerOption` values available on the item so the model is aware of constrained choices.
- Include patient context extracted from the `context` Bundle using a normalized clinical facts block (not full-bundle raw JSON by default).
- Instruct the model to respond with a JSON object containing `recommendedAnswer`, `rationale`, and `confidence` (0.0–1.0).
- Instruct the model to keep `recommendedAnswer` to one concise value or phrase matching the item type.

The function SHALL be a pure function with no side effects — it reads its arguments and returns a string.

The normalized clinical facts block SHALL include resource-specific fields when present:
- Observation: code, value + unit, effective date/time, interpretation, status
- Condition: code, clinicalStatus, verificationStatus, onset, severity
- MedicationStatement: medication, status, dosage text, effective period
- AllergyIntolerance: substance, criticality, reaction manifestations

Each normalized clinical fact SHALL include tiny provenance: `resourceType`, `id`, and best-available clinical date.

The system MAY append raw JSON snippets for a bounded top-N subset of relevant resources, and SHALL NOT append the full bundle JSON by default.

#### Scenario: Item with answer options
- **WHEN** the questionnaire item has `answerOption` entries
- **THEN** the prompt includes those options so the model can select or reference constrained choices

#### Scenario: Item without answer options
- **WHEN** the questionnaire item has no `answerOption`
- **THEN** the prompt instructs the model to produce a free-text answer appropriate to the item type

#### Scenario: Patient context is an empty bundle
- **WHEN** the context bundle has no entries
- **THEN** the prompt still forms a valid string noting that no patient data is available, without throwing

#### Scenario: Questionnaire title is available
- **WHEN** `questionnaire.title` is provided
- **THEN** the prompt includes the questionnaire title to give the model broader clinical context

#### Scenario: Observation includes quantitative value and timing
- **WHEN** an `Observation` has value, unit, status, and effective date/time
- **THEN** the prompt includes those normalized fields plus provenance (`resourceType`, `id`, date)

#### Scenario: Condition includes clinical and verification statuses
- **WHEN** a `Condition` has `clinicalStatus` and `verificationStatus`
- **THEN** the prompt includes both statuses alongside condition code and available onset/severity fields

#### Scenario: Raw JSON snippets are enabled
- **WHEN** optional raw snippet inclusion is configured with a top-N limit
- **THEN** the prompt includes raw JSON only for the selected top-N resources and excludes full-bundle raw JSON
