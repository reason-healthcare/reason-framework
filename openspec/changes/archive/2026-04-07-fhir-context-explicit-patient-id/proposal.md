## Why

`fhirContextDeriver` currently allows patient ID to be absent or guessed from multiple fallback sources — the caller can pass `undefined` and the module will attempt to infer an ID. This ambiguity makes the derivation contract unclear and means the same data can produce different results depending on which fallback fires. Patient identity within a FHIR bundle should always be explicit.

## What Changes

- `deriveContext` requires a non-optional, non-derived `patientId` — callers must supply it directly rather than relying on the deriver to guess
- `getPatientId` is removed as a public export; extracting a patient ID from a subject reference is the caller's responsibility before invoking context derivation
- `buildPatientReferenceSet` no longer accepts an optional bare `patientId` that supplements guessing — the reference set is built solely from an explicit `subjectPayload` and the located Patient entry's own URLs, constructing typed references (`Patient/<id>`) from explicit data only
- ID fallback chains (expressions like `a ?? b` where both sides are different ID sources) are removed throughout the module; each ID must come from one authoritative source

## Capabilities

### New Capabilities

_(none — this change refines an existing internal utility, no new user-facing capabilities)_

### Modified Capabilities

- `fhir-context-deriver`: The contract for context derivation changes — `patientId` becomes required and explicit; `getPatientId` is no longer part of the public API

## Impact

- `fhirContextDeriver.ts` — API surface changes, internal fallback logic removed
- `SelectedPatientPreviewCard.tsx` — calls `getPatientId` before calling `deriveContext`; must be updated to pass an explicit ID or restructure how it resolves the patient
- Any other callers of `getPatientId`, `buildPatientReferenceSet`, or `deriveContext` in `cpg-review`
- Tests for `fhirContextDeriver` and affected components
