## MODIFIED Requirements

### Requirement: Mode switcher renders patient-loading modes
The apply form SHALL render patient-loading modes above the patient input area.

#### Scenario: Default mode prefers uploaded package bundles
- **WHEN** the apply form is opened and uploaded package bundles are available
- **THEN** the `FHIR Bundle` mode SHALL be active by default and the package bundle selection panel SHALL be displayed

#### Scenario: Fallback mode prefers configured endpoint when bundle catalog is unavailable
- **WHEN** the apply form is opened and no uploaded package bundles are available but a FHIR data endpoint is configured
- **THEN** the `FHIR Data Endpoint` mode SHALL be active

#### Scenario: Fallback mode prefers recents when bundle catalog and endpoint are unavailable
- **WHEN** the apply form is opened and no uploaded package bundles are available and no FHIR data endpoint is configured but recent patients exist
- **THEN** the `Recent` mode SHALL be active

### Requirement: Active tab persists within the session
The apply form SHALL remember the last active patient-loading mode for the duration of the browser session.

#### Scenario: Legacy manual session value maps to bundle mode
- **WHEN** the stored session value is `manual`
- **THEN** the apply form SHALL treat it as the `FHIR Bundle` mode

### Requirement: Mode switcher uses segmented button-group visual style
The patient context mode switcher SHALL be rendered as a segmented button group — a row of bordered pill buttons with the active segment filled and elevated — rather than an underline tab style.

#### Scenario: Bundle mode is disabled when no uploaded package bundles are available
- **WHEN** no patient-containing bundles have been indexed from the uploaded package
- **THEN** the `FHIR Bundle` segment SHALL be disabled and SHALL show explanatory tooltip text indicating that no package bundles are available

#### Scenario: Endpoint mode is disabled when no data endpoint is configured
- **WHEN** no FHIR data endpoint is configured
- **THEN** the `FHIR Data Endpoint` segment SHALL be disabled and SHALL show explanatory tooltip text indicating that configuration is required

#### Scenario: Recent mode is disabled when no recent patients exist
- **WHEN** there are no recent patient entries
- **THEN** the `Recent` segment SHALL be disabled and SHALL show explanatory tooltip text indicating that no recently loaded patients are available

### Requirement: Bundle mode surfaces uploaded package bundles
The apply form SHALL surface the local package-bundle browsing workflow through the mode switcher.

#### Scenario: Bundle mode shows searchable package bundle selections
- **WHEN** the `FHIR Bundle` mode is active
- **THEN** the apply form SHALL render a searchable list of package bundle entries from the uploaded package catalog
- **AND** the old manual bundle JSON entry workflow SHALL NOT be displayed
