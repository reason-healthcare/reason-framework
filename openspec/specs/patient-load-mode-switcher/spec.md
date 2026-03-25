## ADDED Requirements

### Requirement: Mode switcher renders two tabs
The apply form SHALL render a "Manual" tab and a "FHIR Data Endpoint" tab above the patient input area.

#### Scenario: Default tab on first load
- **WHEN** the apply form is opened for the first time
- **THEN** the "Manual" tab SHALL be active and the existing manual input panel SHALL be displayed

#### Scenario: Switching to FHIR Data Endpoint tab
- **WHEN** the user clicks the "FHIR Data Endpoint" tab
- **THEN** the FHIR data endpoint patient search panel SHALL be displayed and the manual input panel SHALL be hidden

#### Scenario: Switching back to Manual tab
- **WHEN** the user clicks the "Manual" tab after having viewed the "FHIR Data Endpoint" tab
- **THEN** the manual input panel SHALL be displayed and any previously entered manual content SHALL be preserved

### Requirement: Active tab persists within the session
The apply form SHALL remember the last active tab for the duration of the browser session.

#### Scenario: Tab state retained after navigating away and back
- **WHEN** the user switches to the "FHIR Data Endpoint" tab and navigates to another page then returns to the apply form
- **THEN** the "FHIR Data Endpoint" tab SHALL be active

### Requirement: Mode switcher accessibility
The mode switcher tab elements SHALL be keyboard navigable and have accessible roles.

#### Scenario: Keyboard navigation between tabs
- **WHEN** focus is on the mode switcher and the user presses the arrow keys
- **THEN** focus SHALL move between tabs and the focused tab SHALL be activatable with Enter or Space
