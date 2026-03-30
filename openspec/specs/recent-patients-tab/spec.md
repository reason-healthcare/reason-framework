## ADDED Requirements

### Requirement: Recent patients tab in apply form
The apply form SHALL render a `Recent` tab alongside the `FHIR Bundle` and `FHIR Data Endpoint` modes.

#### Scenario: Recent tab visible when at least one recent patient exists
- **WHEN** localStorage contains at least one recent patient entry
- **THEN** the "Recent" tab SHALL be visible and selectable

#### Scenario: Recent tab hidden when no history exists
- **WHEN** localStorage contains no recent patient entries
- **THEN** the "Recent" tab SHALL not be shown or SHALL be shown in a disabled state with explanatory text

#### Scenario: Package catalog does not by itself enable Recent mode
- **WHEN** uploaded package bundles have been indexed into the package catalog but none have been explicitly selected by the user
- **THEN** those package catalog entries SHALL NOT cause the `Recent` tab to become enabled

### Requirement: Patients written to recent list on selection
Any patient loaded into the apply form via either mode SHALL be written to the recent patients localStorage entry.

#### Scenario: Endpoint-sourced patient added to recents
- **WHEN** the user selects a patient from the FHIR data endpoint search results
- **THEN** a summary object SHALL be written to `cpg-review:recent-patients:endpoint:<endpointUrl>` containing: `id`, `name` (given + family), `dob` (`Patient.birthDate`), `gender` (`Patient.gender`), `source: 'endpoint'`, `endpointUrl` (`dataEndpoint.address`), and `addedAt`

#### Scenario: Selected package bundle added to recents
- **WHEN** the user selects a patient bundle from the `FHIR Bundle` mode
- **THEN** a summary object SHALL be written to `cpg-review:recent-patients:package`
- **AND** that summary SHALL include `id`, `name`, `source: 'package'`, `bundleId`, `bundleReference`, `bundleJson`, `resourceCount`, `resourceTypes`, `patientId`, and `addedAt`

#### Scenario: Uploaded package bundle inventory stored separately from recents
- **WHEN** a package upload is processed
- **THEN** patient-containing bundles extracted from that upload SHALL be written to `cpg-review:package-catalog`
- **AND** they SHALL remain browsable in the `FHIR Bundle` mode even before any bundle is selected

### Requirement: Recent patients list display
The recent patients tab SHALL display a unified list of recently used patients sorted by most recently used first.

#### Scenario: List sorted by addedAt descending
- **WHEN** the recent patients tab is opened
- **THEN** the list SHALL be sorted by `addedAt` descending (most recent first)

#### Scenario: Entry shows name, DOB, gender, source badge, and endpoint or bundle metadata
- **WHEN** a recent patient entry is rendered
- **THEN** it SHALL display:
  - Full name (rendered from stored `name` field)
  - Date of birth (stored `dob` field, from `Patient.birthDate`)
  - Administrative gender (stored `gender` field, from `Patient.gender`)
  - A source badge: "Data Endpoint" for `source: 'endpoint'` entries, "FHIR Bundle" for `source: 'manual'` entries, and "From Package" for `source: 'package'` entries
  - The endpoint URL for endpoint-sourced entries
  - Bundle metadata (`resourceTypes`, `resourceCount`) for package-sourced entries

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

#### Scenario: Package recent selection hydrates bundle payload
- **WHEN** the user activates a recent package-bundle entry
- **THEN** the apply form SHALL set `dataPayload` from the stored `bundleJson`
- **AND** the apply form SHALL set `subject` from `patientId` as `Patient/<id>`

#### Scenario: Package recent selection can fall back to resolver lookup
- **WHEN** a recent package-bundle entry has no stored `bundleJson` and the uploaded resolver is available
- **THEN** the bundle payload SHALL be recovered from `resolver.resourcesByReference[bundleReference]`

#### Scenario: Missing package payload is surfaced as an error
- **WHEN** a recent package-bundle entry has neither valid stored `bundleJson` nor a resolver fallback bundle
- **THEN** the UI SHALL display a user-facing error and SHALL NOT update the active patient context

#### Scenario: Selection affordance covers the full row
- **WHEN** the recent-patients list or package bundle list is rendered
- **THEN** the full patient row SHALL act as the selection control
- **AND** keyboard activation with Enter or Space SHALL select the row

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

#### Scenario: Bundle and recent lists scroll after reaching maximum visible height
- **WHEN** enough patient or bundle rows are rendered to exceed the maximum visible list height
- **THEN** the list container SHALL scroll vertically while preserving the surrounding apply-form layout and visible border treatment
