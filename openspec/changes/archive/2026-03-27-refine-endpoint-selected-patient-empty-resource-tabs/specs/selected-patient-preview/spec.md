## MODIFIED Requirements

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

#### Scenario: Raw JSON tab shows loaded patient payload
- **WHEN** the `Raw JSON` tab is active
- **THEN** the UI SHALL render the raw FHIR JSON payload (as received from the patient context source, prior to any normalization or display transformation) in a readable preformatted view with internal scrolling if content exceeds available space