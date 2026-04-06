## ADDED Requirements

### Requirement: Panel uses existing dataEndpoint
The FHIR patient search panel SHALL derive the FHIR server base URL from the `dataEndpoint` parameter already present in the apply form (specifically `dataEndpoint.address`). No separate server URL input field SHALL be introduced.

#### Scenario: Panel available when dataEndpoint is configured
- **WHEN** the apply form has a valid `dataEndpoint` with an `address` value
- **THEN** the "FHIR Data Endpoint" tab SHALL be enabled and the patient search panel SHALL be accessible

#### Scenario: Panel disabled when dataEndpoint is absent
- **WHEN** the apply form has no `dataEndpoint` configured
- **THEN** the "FHIR Data Endpoint" tab SHALL be disabled with an explanatory tooltip indicating a data endpoint must be configured

### Requirement: Patient search uses a searchable dropdown
The panel SHALL render a single searchable dropdown (`Select` with `showSearch`) instead of a separate text input and result list. The dropdown SHALL issue a server-side `GET /Patient?name=<query>` request as the user types (debounced) and populate its options with matching patients.

#### Scenario: Typing triggers a server search
- **WHEN** the user types at least one character into the dropdown search input
- **THEN** the panel SHALL call `fhirClient(dataEndpoint.address, { path: '/Patient', params: { name: query } })` after a short debounce and populate the dropdown options with the results

#### Scenario: Empty query
- **WHEN** the dropdown input is empty
- **THEN** no network request SHALL be issued and the dropdown SHALL show a prompt such as "Type to search patients"

### Requirement: Search loading state
The dropdown SHALL display a loading indicator while a patient search is in progress.

#### Scenario: Loading state visible during request
- **WHEN** a search request has been issued and no response has been received
- **THEN** the dropdown SHALL render a loading spinner in place of the standard dropdown arrow and options SHALL be replaced with a loading message

### Requirement: Search result options
Each dropdown option SHALL display a formatted label for the matching patient.

#### Scenario: Options displayed with full name, DOB, gender, and patient ID
- **WHEN** the FHIR server returns one or more Patient resources
- **THEN** each option SHALL display:
  - Full name derived from `Patient.name`: the first `HumanName` entry rendered as `given` (joined by space) + `family`
  - Date of birth from `Patient.birthDate`
  - Administrative gender from `Patient.gender`
  - FHIR patient ID from `Patient.id`

#### Scenario: No results
- **WHEN** the FHIR server returns zero Patient resources for the query
- **THEN** the dropdown SHALL display a "No patients found" empty state in the options area

### Requirement: Patient summary stored on selection
When a patient is selected from the result list the system SHALL store a patient summary object containing: `id` (`Patient.id`), `resourceType: 'Patient'`, `name` (rendered full name), `dob` (`Patient.birthDate`), `gender` (`Patient.gender`), `source: 'endpoint'`, `endpointUrl` (`dataEndpoint.address`), `json` (the raw Patient FHIR resource serialized as JSON), and `addedAt` (ISO 8601 timestamp).

#### Scenario: Selecting a patient populates apply context
- **WHEN** the user selects an option from the dropdown
- **THEN** the apply form `subject` parameter SHALL be set to `Patient/<Patient.id>` and the patient summary SHALL be added to the recent patients list

#### Scenario: Patient summary json field contains raw Patient resource
- **WHEN** a patient is selected and the summary is written to the recent patients store
- **THEN** the `json` field SHALL contain the serialized FHIR `Patient` resource as returned by the server, with `resourceType: 'Patient'`
- **AND** the `json` field SHALL NOT be a Bundle wrapper

### Requirement: FHIR server error state
The panel SHALL display an error message when the FHIR server returns an error or is unreachable.

#### Scenario: Network or CORS error
- **WHEN** the `fhirClient` request fails due to a network error or CORS rejection
- **THEN** the panel SHALL display a user-facing error message and a suggestion to check the server URL and CORS configuration

#### Scenario: FHIR server HTTP error
- **WHEN** the FHIR server returns a 4xx or 5xx response
- **THEN** the panel SHALL display the error status and a descriptive message

### Requirement: fhirClient abstraction
All HTTP requests from the FHIR patient search panel SHALL be routed through a shared `fhirClient` module and SHALL NOT call `fetch` directly.

#### Scenario: fhirClient called with endpoint address and path
- **WHEN** the panel initiates a patient search
- **THEN** the request SHALL be delegated to `fhirClient(dataEndpoint.address, { path: '/Patient', params: { name: query } })`
