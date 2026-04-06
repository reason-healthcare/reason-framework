## ADDED Requirements

### Requirement: ResourceIdentifier type exported from fhirContextDeriver
`fhirContextDeriver` SHALL export a `ResourceIdentifier` interface with `resourceType: string` and `id: string`. This type is the canonical representation of a typed FHIR resource identity used throughout the context derivation API.

#### Scenario: Consumer imports ResourceIdentifier
- **WHEN** a module imports `ResourceIdentifier` from `utils/fhirContextDeriver`
- **THEN** the type is available with `resourceType` and `id` string properties

### Requirement: Context derivation accepts a typed subject identity
`deriveContext` SHALL accept `subject: ResourceIdentifier` as its patient identity parameter instead of separate `subjectPayload: string` and `patientId: string` params. The function SHALL construct the reference string internally as `` `${subject.resourceType}/${subject.id}` `` and SHALL only match the Patient resource whose `resource.id` equals `subject.id`. There is no fallback to accepting an arbitrary Patient resource.

#### Scenario: Patient matched by explicit ResourceIdentifier
- **WHEN** `deriveContext` is called with `subject: { resourceType: 'Patient', id: 'Patient1' }`
- **THEN** the returned `patient` is the resource with `id === 'Patient1'`, and clinical resources are filtered to those referencing that patient

#### Scenario: No patient match when id not present in bundle
- **WHEN** `deriveContext` is called with a `subject.id` that does not match any Patient in the bundle
- **THEN** the returned `patient` is `undefined` and `medications`, `conditions`, and `observations` are empty arrays

### Requirement: Reference set accepts ResourceIdentifier instead of string params
`buildPatientReferenceSet` SHALL accept `subject: ResourceIdentifier` and `entries` — no `subjectPayload: string` or bare `patientId` parameters. The reference set SHALL be seeded from: (a) aliases of the reference constructed from `subject`, and (b) the matched Patient entry's own `resource.id` and `fullUrl` as found in the bundle.

#### Scenario: Reference set constructed from ResourceIdentifier
- **WHEN** `buildPatientReferenceSet` is called with `subject: { resourceType: 'Patient', id: 'abc' }` and bundle entries containing a Patient with `id: 'abc'` and `fullUrl: 'http://example.org/fhir/Patient/abc'`
- **THEN** the returned set contains aliases for `'Patient/abc'`, `'abc'`, and `'http://example.org/fhir/Patient/abc'`

### Requirement: `getPatientId` is not part of the public API
`fhirContextDeriver` SHALL NOT export `getPatientId`. No string parsing of reference strings is required at call sites — callers construct `ResourceIdentifier` directly from known resource type and id values.

#### Scenario: Consumer attempts to import getPatientId
- **WHEN** a module attempts to import `getPatientId` from `utils/fhirContextDeriver`
- **THEN** TypeScript reports a compile error — the export does not exist

### Requirement: Patient selection callbacks carry ResourceIdentifier
The `onPatientSelect` callback in `PatientLoadModeSwitcher`, `FhirPatientSearchPanel`, and `PatientSelectionPanel` SHALL pass `subject: ResourceIdentifier` as its first argument instead of a subject reference string. Callers SHALL construct `{ resourceType: 'Patient', id }` from explicit known values.

#### Scenario: Patient selected from FHIR endpoint search
- **WHEN** a user selects a patient from the FHIR search results
- **THEN** `onPatientSelect` is called with `{ resourceType: 'Patient', id: row.id }` as the subject — not a string

#### Scenario: Patient selected from package bundle
- **WHEN** a user selects a patient from a package bundle and the bundle contains a Patient resource with a parseable `id`
- **THEN** `onPatientSelect` is called with `{ resourceType: 'Patient', id: patientId }` where `patientId` was extracted from the bundle

#### Scenario: Package patient with no resolvable ID
- **WHEN** a user selects a package patient and `getPatientIdFromBundleJson` returns `undefined`
- **THEN** the selection does not proceed — no fallback to `summary.id` or other ID source is used

### Requirement: Subject reference string constructed only at API boundary
`ApplyForm` SHALL track patient identity as `patientSubject: ResourceIdentifier | undefined`. The reference string `Patient/<id>` SHALL be assembled only at the `handleSubmit` and `handleQuestionnaireSubmit` call sites immediately before the API payload is constructed.

#### Scenario: Submit with valid patient subject
- **WHEN** `handleSubmit` is called with a non-null `patientSubject`
- **THEN** the API payload contains `subjectPayload: \`${patientSubject.resourceType}/${patientSubject.id}\``

#### Scenario: SelectedPatientPreviewCard receives typed subject
- **WHEN** a patient is selected
- **THEN** `SelectedPatientPreviewCard` receives `subject: ResourceIdentifier` — not a raw string — and calls `deriveContext(bundle, subject)`
