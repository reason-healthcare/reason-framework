## MODIFIED Requirements

### Requirement: Recent patients tab in apply form
The apply form SHALL render a `Recent` tab alongside the `FHIR Bundle` and `FHIR Data Endpoint` modes.

#### Scenario: Package catalog does not by itself enable Recent mode
- **WHEN** uploaded package bundles have been indexed into the package catalog but none have been explicitly selected by the user
- **THEN** those package catalog entries SHALL NOT cause the `Recent` tab to become enabled

### Requirement: Patients written to recent list on selection
Any patient loaded into the apply form via an explicit selection action SHALL be written to the appropriate recent-patients localStorage entry.

#### Scenario: Selected package bundle added to recents
- **WHEN** the user selects a patient bundle from the `FHIR Bundle` mode
- **THEN** a summary object SHALL be written to `cpg-review:recent-patients:package`
- **AND** that summary SHALL include `id`, `name`, `source: 'package'`, `bundleId`, `bundleJson`, `resourceCount`, `resourceTypes`, `patientId`, and `addedAt`

#### Scenario: Uploaded package bundle inventory stored separately from recents
- **WHEN** a package upload is processed
- **THEN** patient-containing bundles extracted from that upload SHALL be written to `cpg-review:package-catalog`
- **AND** they SHALL remain browsable in the `FHIR Bundle` mode even before any bundle is selected

### Requirement: Recent patients list display
The recent patients tab SHALL display a unified list of recently used patients sorted by most recently used first.

#### Scenario: Package entry shows bundle metadata
- **WHEN** a recent patient entry has `source: 'package'`
- **THEN** it SHALL display a `From Package` badge
- **AND** it SHALL display bundle metadata including `resourceTypes` and `resourceCount`

### Requirement: One-click re-selection from recent list
The user SHALL be able to load a recent patient into the apply context with a single explicit selection action.

#### Scenario: Package recent selection hydrates bundle payload
- **WHEN** the user activates a recent package-bundle entry
- **THEN** the apply form SHALL set `dataPayload` from the stored `bundleJson`
- **AND** the apply form SHALL set `subject` from `patientId` as `Patient/<id>`

#### Scenario: Package recent selection can fall back to resolver lookup
- **WHEN** a recent package-bundle entry has no stored `bundleJson` and the uploaded resolver is available
- **THEN** the bundle payload SHALL be recovered from `resolver.resourcesByReference[bundleId]`

#### Scenario: Missing package payload is surfaced as an error
- **WHEN** a recent package-bundle entry has neither valid stored `bundleJson` nor a resolver fallback bundle
- **THEN** the UI SHALL display a user-facing error and SHALL NOT update the active patient context

#### Scenario: Selection affordance covers the full row
- **WHEN** the recent-patients list or package bundle list is rendered
- **THEN** the full patient row SHALL act as the selection control
- **AND** keyboard activation with Enter or Space SHALL select the row

### Requirement: Recent patients list is scrollable within a fixed-height container
The recent patients list SHALL be rendered inside a fixed-height scrollable container so that the patient context panel height remains predictable regardless of how many entries exist.

#### Scenario: Bundle and recent lists scroll after reaching maximum visible height
- **WHEN** enough patient or bundle rows are rendered to exceed the maximum visible list height
- **THEN** the list container SHALL scroll vertically while preserving the surrounding apply-form layout and visible border treatment
