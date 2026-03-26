## ADDED Requirements

### Requirement: Selected patient preview card is shown when context is active
The apply form SHALL render a selected patient preview card whenever an active patient context exists.

#### Scenario: Preview card appears after patient selection
- **WHEN** the user selects a patient via manual input, endpoint search, or recent patients
- **THEN** a selected patient preview card SHALL render in the patient context area

### Requirement: Preview card includes clear selected patient action
The selected patient preview card SHALL provide a clear action that removes the active patient context from the apply form.

#### Scenario: Clearing selected patient resets active context
- **WHEN** the user activates the clear selected patient action
- **THEN** the active patient context SHALL be removed and the preview card SHALL no longer be shown

### Requirement: Preview card supports tabbed patient detail views
The selected patient preview card SHALL provide tabs named `Overview`, `Medications`, `Conditions`, and `Raw JSON`.

#### Scenario: Overview tab shows core patient summary
- **WHEN** the `Overview` tab is active
- **THEN** the UI SHALL display patient summary details including identifier, name, date of birth, and gender when available

#### Scenario: Medications tab shows medication data or empty state
- **WHEN** the `Medications` tab is active
- **THEN** the UI SHALL display medication entries derived from loaded patient context, or a deterministic empty state when no medication data is available

#### Scenario: Conditions tab shows condition data or empty state
- **WHEN** the `Conditions` tab is active
- **THEN** the UI SHALL display condition entries derived from loaded patient context, or a deterministic empty state when no condition data is available

#### Scenario: Raw JSON tab shows loaded patient payload
- **WHEN** the `Raw JSON` tab is active
- **THEN** the UI SHALL render the loaded patient context JSON in a readable preformatted view with internal scrolling if content exceeds available space