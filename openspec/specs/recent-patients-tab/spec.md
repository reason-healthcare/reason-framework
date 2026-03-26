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
The user SHALL be able to load a recent patient into the apply context with a single explicit selection action.

#### Scenario: Selecting a recent patient sets apply context
- **WHEN** the user activates a recent patient row selection control
- **THEN** that patient SHALL be set as the active patient context for the apply form and the entry's `addedAt` SHALL be updated to the current timestamp

#### Scenario: Recent selection hydrates selected patient preview
- **WHEN** a recent patient is selected
- **THEN** the selected patient preview card SHALL render with the selected patient's details and tabbed views

#### Scenario: Recent selection is keyboard accessible
- **WHEN** focus is on a recent patient selection control and the user presses Enter or Space
- **THEN** the selected recent patient SHALL be loaded into the active apply context

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

### Requirement: Recent patients list is scrollable within a fixed-height container
The recent patients list SHALL be rendered inside a fixed-height scrollable container so that the patient context panel height remains predictable regardless of how many entries exist.

#### Scenario: Container scrolls when entries exceed visible area
- **WHEN** the recent patients list contains enough entries to exceed the container height
- **THEN** the container SHALL scroll vertically and patient entries outside the visible area SHALL be reachable by scrolling

#### Scenario: Container height does not grow beyond maximum
- **WHEN** the recent patients list is rendered with any number of entries
- **THEN** the panel height SHALL NOT exceed the fixed container maximum, and the rest of the apply form layout SHALL remain stable
