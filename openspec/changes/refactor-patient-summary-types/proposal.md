## Why

`PatientSummary` is a single flat interface that conflates two distinct FHIR resource shapes — a `Patient` (endpoint source) and a `Bundle` (package source) — causing a semantic collision on `id`, optional fields with hidden invariants, and scattered `source`-based branching in UI code. This refactor makes the distinction explicit and type-safe.

## What Changes

- **BREAKING** Replace the single `PatientSummary` interface with a discriminated union: `EndpointPatientSummary | PackagePatientSummary` sharing a `BasePatientSummary`
- **BREAKING** Rename `bundleReference` → `bundleId` on package summaries (the bundle's resource ID, e.g. `"abc123"`)
- **BREAKING** Remove `bundleJson` from the package-specific type; move a unified `json` field to `BasePatientSummary` (stores the relevant FHIR resource payload for both sources)
- Add `resourceType: 'Patient'` (fixed) to endpoint summaries and `resourceType: 'Bundle'` (fixed) to package summaries, enabling reference reconstruction as `{resourceType}/{id}` without special-casing
- Remove the now-redundant `patientId` field from `PackagePatientSummary` — the patient ID is derivable from the stored Bundle's Patient entry when needed
- Remove `bundleReference` (full reference string was redundant given `resourceType` + `id`)
- Collapse `PackageBundleExtract` — it now maps 1-to-1 onto `PackagePatientSummary` and can be eliminated as an intermediate type

## Capabilities

### New Capabilities
<!-- none — this is a refactor, no new user-facing capabilities -->

### Modified Capabilities
- `recent-patients-tab`: stored summary fields are changing — `bundleReference` and `bundleJson` are removed, `bundleId`, `resourceType`, and `json` replace them; `patientId` is removed
- `fhir-patient-search-panel`: endpoint patient summary must include `resourceType: 'Patient'` and `json` (minimal Patient bundle payload); `id` field meaning is now formally `Patient.id`

## Impact

- `utils/recentPatientsStore.ts` — `PatientSummary` interface replaced with union types
- `utils/packageBundleExtractor.ts` — `PackageBundleExtract` interface removed; `extractBundlesFromResolver` returns `PackagePatientSummary[]` directly; `indexPackageBundles` simplified
- `components/apply-form/FhirPatientSearchPanel.tsx` — summary construction updated; `json` populated with minimal Patient collection bundle
- `components/apply-form/PatientSelectionPanel.tsx` — `source`-branching for subject construction simplified using `resourceType`; `bundleJson` references replaced with `json`
- `components/apply-form/ApplyForm.tsx` — any `bundleJson` / `patientId` references updated
- localStorage data written under existing keys will be stale after this change (existing entries may have missing fields); a migration or graceful fallback is needed
- All tests referencing the old shape must be updated
