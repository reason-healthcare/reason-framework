## MODIFIED Requirements

### Requirement: Patients written to recent list on selection
Any patient loaded into the apply form via either mode SHALL be written to the recent patients localStorage entry.

#### Scenario: Endpoint-sourced patient added to recents
- **WHEN** the user selects a patient from the FHIR data endpoint search results
- **THEN** a summary object SHALL be written to `cpg-review:recent-patients:endpoint:<endpointUrl>` containing: `id`, `name` (given + family), `dob` (`Patient.birthDate`), `gender` (`Patient.gender`), `source: 'endpoint'`, `endpointUrl` (`dataEndpoint.address`), and `addedAt`

#### Scenario: Selected package bundle added to recents
- **WHEN** the user selects a patient bundle from the `FHIR Bundle` mode
- **THEN** a summary object SHALL be written to `cpg-review:recent-patients:package`
- **AND** that summary SHALL include `id`, `name`, `source: 'package'`, `bundleId` (resource ID only), `bundleReference` (full FHIR reference), `bundleJson`, `resourceCount`, `resourceTypes`, `patientId`, and `addedAt`

#### Scenario: Uploaded package bundle inventory stored separately from recents
- **WHEN** a package upload is processed
- **THEN** patient-containing bundles extracted from that upload SHALL be written to `cpg-review:package-catalog`
- **AND** they SHALL remain browsable in the `FHIR Bundle` mode even before any bundle is selected

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
