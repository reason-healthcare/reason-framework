## ADDED Requirements

### Requirement: Recent patients tab in apply form
The apply form SHALL render a "Recent" tab alongside the Manual and FHIR Server tabs.

#### Scenario: Recent tab visible when at least one recent patient exists
- **WHEN** localStorage contains at least one recent patient entry
- **THEN** the "Recent" tab SHALL be visible and selectable

#### Scenario: Recent tab hidden when no history exists
- **WHEN** localStorage contains no recent patient entries
- **THEN** the "Recent" tab SHALL not be shown or SHALL be shown in a disabled state with explanatory text

### Requirement: Patients written to recent list on selection
Any patient loaded into the apply form via either mode SHALL be written to the recent patients localStorage entry.

#### Scenario: Endpoint-sourced patient added to recents
- **WHEN** the user selects a patient from the FHIR data endpoint search results
- **THEN** a summary object SHALL be written to `cpg-review:recent-patients:endpoint:<endpointUrl>` containing: `id`, `name` (given + family), `dob` (`Patient.birthDate`), `gender` (`Patient.gender`), `source: 'endpoint'`, `endpointUrl` (`dataEndpoint.address`), and `addedAt`

#### Scenario: Manual patient added to recents
- **WHEN** the user successfully submits a patient via the manual input mode
- **THEN** a summary object SHALL be written to `cpg-review:recent-patients:manual` containing: `id`, `name`, `dob`, `gender` (where available from the supplied data), `source: 'manual'`, and `addedAt`

### Requirement: Recent patients list display
The recent patients tab SHALL display a unified list of recently used patients sorted by most recently used first.

#### Scenario: List sorted by addedAt descending
- **WHEN** the recent patients tab is opened
- **THEN** the list SHALL be sorted by `addedAt` descending (most recent first)

#### Scenario: Entry shows name, DOB, gender, source badge, and endpoint (if endpoint-sourced)
- **WHEN** a recent patient entry is rendered
- **THEN** it SHALL display:
  - Full name (rendered from stored `name` field)
  - Date of birth (stored `dob` field, from `Patient.birthDate`)
  - Administrative gender (stored `gender` field, from `Patient.gender`)
  - A source badge: "Data Endpoint" for `source: 'endpoint'` entries, "Manual" for `source: 'manual'` entries
  - The endpoint URL for endpoint-sourced entries

### Requirement: One-click re-selection from recent list
The user SHALL be able to load a recent patient into the apply context with a single action.

#### Scenario: Clicking a recent patient sets apply context
- **WHEN** the user clicks a patient in the recent list
- **THEN** that patient SHALL be set as the active patient context for the apply form and the entry's `addedAt` SHALL be updated to the current timestamp

### Requirement: LRU eviction at maximum capacity
Each recent patients localStorage key SHALL hold a maximum of 10 entries. When a new entry is added beyond the limit the oldest entry SHALL be evicted.

#### Scenario: 11th entry evicts the oldest
- **WHEN** a new patient is added and the relevant localStorage key already contains 10 entries
- **THEN** the entry with the oldest `addedAt` value SHALL be removed before the new entry is written

### Requirement: Clear recent patients
The user SHALL be able to clear all recent patients.

#### Scenario: Clearing recent patients removes all entries
- **WHEN** the user clicks the "Clear recent patients" action
- **THEN** all localStorage keys matching `cpg-review:recent-patients:*` SHALL be removed and the recent tab SHALL reflect an empty state
