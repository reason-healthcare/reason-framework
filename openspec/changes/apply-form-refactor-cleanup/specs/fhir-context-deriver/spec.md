## ADDED Requirements

### Requirement: FHIR bundle utilities are isolated in a dedicated module
The system SHALL provide a `utils/fhirContextDeriver.ts` module that contains all pure FHIR bundle traversal and context derivation utilities. No React imports SHALL appear in this module.

#### Scenario: Module exports deriveContext
- **WHEN** a consumer imports `deriveContext` from `utils/fhirContextDeriver`
- **THEN** it receives a function that accepts a `fhir4.Bundle | undefined`, a subject reference string, and a patient ID string, and returns a `DerivedContext` object with `patient`, `medications`, `conditions`, and `observations` fields

#### Scenario: Module exports display helpers
- **WHEN** a consumer imports `mrnValue` or `formatAddress` from `utils/fhirContextDeriver`
- **THEN** each function accepts a `fhir4.Patient | undefined` and returns a display string, returning `'—'` when no relevant data is present

#### Scenario: Module exports reference utilities
- **WHEN** a consumer imports `referenceAliases` or `getPatientId` from `utils/fhirContextDeriver`
- **THEN** each function operates as a pure function with no side effects

#### Scenario: SelectedPatientPreviewCard imports from the module
- **WHEN** `SelectedPatientPreviewCard` renders
- **THEN** all FHIR traversal logic is delegated to `utils/fhirContextDeriver` — no inline FHIR utilities exist in the component file
