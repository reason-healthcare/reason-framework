## MODIFIED Requirements

### Requirement: Patient summary stored on selection
When a patient is selected from the result list the system SHALL store a patient summary object containing: `id` (`Patient.id`), `resourceType: 'Patient'`, `name` (rendered full name), `dob` (`Patient.birthDate`), `gender` (`Patient.gender`), `source: 'endpoint'`, `endpointUrl` (`dataEndpoint.address`), `json` (the raw Patient FHIR resource serialized as JSON), and `addedAt` (ISO 8601 timestamp).

#### Scenario: Selecting a patient populates apply context
- **WHEN** the user selects an option from the dropdown
- **THEN** the apply form `subject` parameter SHALL be set to `Patient/<Patient.id>` and the patient summary SHALL be added to the recent patients list

#### Scenario: Patient summary json field contains raw Patient resource
- **WHEN** a patient is selected and the summary is written to the recent patients store
- **THEN** the `json` field SHALL contain the serialized FHIR `Patient` resource as returned by the server, with `resourceType: 'Patient'`
- **AND** the `json` field SHALL NOT be a Bundle wrapper
