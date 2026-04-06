## Why

The `apply-form` feature introduced on this branch contains several redundancies and over-complications that accumulated across iterative commits: dead utility code, duplicated localStorage management, parallel `PatientSummary` construction logic, and misplaced helpers. These make the code harder to reason about and test without changing any user-visible behaviour.

## What Changes

- Extract pure FHIR context-derivation utilities from `SelectedPatientPreviewCard.tsx` into a dedicated `utils/fhirContextDeriver.ts` module
- Remove the endpoint state restoration logic from `ApplyForm`'s `applyPayload` `useEffect` — endpoints are fully owned and persisted by `EndpointsConfiguration`; the duplicate restoration is a no-op that creates confusion
- Remove the hardcoded default endpoint values from `ApplyForm` state initialisers (they're overridden immediately by `EndpointsConfiguration`)
- Extract a shared `makeBundlePatientSummary` factory to eliminate parallel `PackagePatientSummary` construction in `ApplyForm.handleSubmit` and `SelectedPatientPreviewCard`
- Fix the unreachable `else if (dataEndpointPayload == undefined)` branch in `isValidForm`
- Move `renderPatientName` from `recentPatientsStore.ts` to `helpers.tsx` where FHIR display utilities live

## Capabilities

### New Capabilities

- `fhir-context-deriver`: Pure utility module isolating FHIR bundle traversal/derivation logic used by patient preview

### Modified Capabilities

<!-- No spec-level behaviour changes — this is implementation-only cleanup -->

## Impact

- `packages/cpg-review/src/app/components/apply-form/SelectedPatientPreviewCard.tsx` — removes embedded utilities, imports from new module
- `packages/cpg-review/src/app/utils/fhirContextDeriver.ts` — new file
- `packages/cpg-review/src/app/components/apply-form/ApplyForm.tsx` — removes duplicate endpoint state init and restoration; uses shared summary factory
- `packages/cpg-review/src/app/utils/recentPatientsStore.ts` — removes `renderPatientName` export
- `packages/cpg-review/src/app/helpers.tsx` — adds `renderPatientName`
- All test files that import `renderPatientName` from `recentPatientsStore` will need import path updates
