## Purpose
Define expected behavior for the selected patient preview card in the apply form, including visibility, clearing behavior, tabbed sections, and data presentation for patient context resources.
## Requirements
### Requirement: Selected patient preview card is shown when context is active
The apply form SHALL render a selected patient preview card whenever an active patient context exists.

#### Scenario: Preview card appears after patient selection
- **WHEN** the user selects a patient via bundle select, endpoint search, or recent patients/bundles
- **THEN** a selected patient preview card SHALL render in the patient context area

### Requirement: Preview card includes clear selected patient action
The selected patient preview card SHALL provide a clear action that removes the active patient context from the apply form.

#### Scenario: Clearing selected patient resets active context
- **WHEN** the user activates the clear selected patient action
- **THEN** the active patient context SHALL be removed and the preview card SHALL no longer be shown

### Requirement: Preview card supports tabbed patient detail views
The selected patient preview card SHALL provide tabs named `Overview`, `Medications`, `Conditions`, `Observations`, and `Raw JSON`.

#### Scenario: Overview tab shows core patient summary
- **WHEN** the `Overview` tab is active
- **THEN** the UI SHALL display patient summary details including identifier, name, date of birth, and gender when available

#### Scenario: Medications tab shows loaded medication data
- **WHEN** the `Medications` tab is active and medication data exists in loaded patient context
- **THEN** the UI SHALL display medication entries derived from loaded patient context

#### Scenario: Medications tab shows endpoint-not-loaded empty state
- **WHEN** the `Medications` tab is active and the selected patient source is a FHIR data endpoint and no medication resources were loaded for this selection
- **THEN** the UI SHALL display a deterministic empty state indicating medication data is not loaded for endpoint-selected patients

#### Scenario: Conditions tab shows loaded condition data
- **WHEN** the `Conditions` tab is active and condition data exists in loaded patient context
- **THEN** the UI SHALL display condition entries derived from loaded patient context

#### Scenario: Conditions tab shows endpoint-not-loaded empty state
- **WHEN** the `Conditions` tab is active and the selected patient source is a FHIR data endpoint and no condition resources were loaded for this selection
- **THEN** the UI SHALL display a deterministic empty state indicating condition data is not loaded for endpoint-selected patients

#### Scenario: Observations tab shows loaded observation data
- **WHEN** the `Observations` tab is active and observation data exists in loaded patient context
- **THEN** the UI SHALL display observation entries derived from loaded patient context

#### Scenario: Observations tab shows endpoint-not-loaded empty state
- **WHEN** the `Observations` tab is active and the selected patient source is a FHIR data endpoint and no observation resources were loaded for this selection
- **THEN** the UI SHALL display a deterministic empty state indicating observation data is not loaded for endpoint-selected patients

#### Scenario: Raw JSON tab shows Patient resource for endpoint patients
- **WHEN** the `Raw JSON` tab is active and the selected patient source is `'endpoint'`
- **THEN** the UI SHALL render the raw `Patient` FHIR resource JSON (from `selectedPatient.json`) in a readable preformatted view
- **AND** the rendered JSON SHALL have `resourceType: "Patient"` at the top level, not a Bundle wrapper

#### Scenario: Raw JSON tab shows full payload for non-endpoint patients
- **WHEN** the `Raw JSON` tab is active and the selected patient source is not `'endpoint'` (e.g. `'package'`)
- **THEN** the UI SHALL render the full FHIR payload from the patient context data (the loaded Bundle) in a readable preformatted view

#### Scenario: Raw JSON tab shows fallback when no payload available
- **WHEN** the `Raw JSON` tab is active and no relevant payload is available
- **THEN** the UI SHALL display "No raw FHIR payload loaded."

### Requirement: Patient details tabs use property-based resource rendering
The selected patient preview card SHALL render loaded medication, condition, and observation resources by iterating non-META properties and formatting each property with `formatProperty`.

#### Scenario: Medications tab shows loaded medication data
- **WHEN** the `Medications` tab is active and medication data exists in loaded patient context
- **THEN** the UI SHALL display medication entries using property-based iteration with `formatProperty`
- **AND** the UI SHALL exclude META fields (`id`, `text`, `meta`)
- **AND** `meta.profile` SHALL remain excluded as part of excluded `meta`

#### Scenario: Conditions tab shows loaded condition data
- **WHEN** the `Conditions` tab is active and condition data exists in loaded patient context
- **THEN** the UI SHALL display condition entries using property-based iteration with `formatProperty`
- **AND** the UI SHALL exclude META fields (`id`, `text`, `meta`)
- **AND** `meta.profile` SHALL remain excluded as part of excluded `meta`

#### Scenario: Observations tab shows loaded observation data
- **WHEN** the `Observations` tab is active and observation data exists in loaded patient context
- **THEN** the UI SHALL display observation entries using property-based iteration with `formatProperty`
- **AND** the UI SHALL exclude META fields (`id`, `text`, `meta`)
- **AND** `meta.profile` SHALL remain excluded as part of excluded `meta`

#### Scenario: Observation properties include complex datatypes
- **WHEN** an observation has a `valueQuantity` with `value`, `unit`, and `system` fields
- **THEN** the formatted `valueQuantity` property SHALL display subfields using existing type-appropriate formatters

