## Context

`PatientSummary` in `utils/recentPatientsStore.ts` is a single flat interface used for two structurally different FHIR resources: a `Patient` resource (sourced from a FHIR data endpoint) and a `Bundle` resource (sourced from an uploaded package). The current design forces optional fields to carry hidden invariants (e.g. `id` means `Patient.id` for endpoint patients but `bundleReference` for package patients) and requires `source`-based branching at every callsite. `PackageBundleExtract` in `packageBundleExtractor.ts` is an intermediate shape that maps 1-to-1 onto `PatientSummary` for the package case, adding unnecessary translation.

## Goals / Non-Goals

**Goals:**
- Replace `PatientSummary` with a TypeScript discriminated union so the type system enforces which fields are present for each source
- Unify the JSON payload field (`json`) on `BasePatientSummary` so both sources carry "the relevant FHIR resource as JSON" in the same place
- Add a fixed `resourceType` field to each union arm, enabling `${resourceType}/${id}` reference reconstruction without `source`-branching
- Use `bundleId` (the Bundle resource's `id`) as the identifier for package patients, making `id` unambiguous across both arms
- Eliminate `PackageBundleExtract` as an intermediate type
- Provide a safe localStorage migration / graceful fallback for stale entries

**Non-Goals:**
- Changing how patients are stored per-key in localStorage (key structure stays the same)
- Adding new user-facing features
- Changing the FHIR Patient search panel UX

## Decisions

### 1. Discriminated union via `source` field

```ts
interface BasePatientSummary {
  name: string
  dob?: string
  gender?: string
  json: string          // serialized FHIR payload (Patient collection bundle OR full Bundle)
  addedAt: string
}

interface EndpointPatientSummary extends BasePatientSummary {
  source: 'endpoint'
  resourceType: 'Patient'
  id: string           // Patient.id
  endpointUrl: string
}

interface PackagePatientSummary extends BasePatientSummary {
  source: 'package'
  resourceType: 'Bundle'
  id: string           // Bundle.id  (was bundleId / bundleReference's resource part)
  resourceCount?: number
  resourceTypes?: string[]
}

type PatientSummary = EndpointPatientSummary | PackagePatientSummary
```

**Alternatives considered:**
- Keeping a single flat interface with optional fields — rejected; hides invariants, no compiler enforcement.
- Separate stores for endpoint vs package patients — rejected; would require refactoring all consumers and localStorage key strategy.

### 2. `id` semantics

For endpoint patients, `id` = `Patient.id` (unchanged).
For package patients, `id` = `Bundle.id` (the resource ID, not the full reference string). The full FHIR reference is reconstructable as `${resourceType}/${id}` = `Bundle/${id}`, eliminating the need for a separate `bundleReference` field.

### 3. `json` on `BasePatientSummary`

Both source types already carry a serialized FHIR payload:
- Endpoint: a minimal `collection` bundle containing the single `Patient` resource (already constructed in `FhirPatientSearchPanel.handleChange`)
- Package: the full uploaded `Bundle`

Moving `json` to `BasePatientSummary` normalizes the payload access pattern. The field replaces `bundleJson` on `PackagePatientSummary` and formalizes what was previously an implicit construction at endpoint selection time.

### 4. Removing `patientId` from `PackagePatientSummary`

`patientId` was needed because `id` held `bundleReference` — once `id` is the Bundle's resource ID, consumers that need the `Patient.id` can parse it from `json`. The apply context subject (`Patient/<patientId>`) is reconstructed by finding the `Patient` entry in the stored bundle. This is a small cost for a significant simplification.

**Alternatives considered:**
- Keep `patientId` as an explicit field — avoids parsing `json` but perpetuates a field not present on endpoint patients; can add back if profiling shows the parse cost matters.

### 5. Eliminating `PackageBundleExtract`

`extractBundlesFromResolver` will return `PackagePatientSummary[]` directly. `indexPackageBundles` will accept `PackagePatientSummary[]` and call `setPackageCatalog`. No behavior change, one fewer interface.

### 6. `setPackageCatalog` / `getPackageCatalog` type narrowing

Both functions will be typed as `PackagePatientSummary[]` since the catalog is exclusively package bundles.

### 7. localStorage migration

Stored entries from before this change will be missing `resourceType` and `json`, and will carry the old `bundleJson` / `patientId` / `bundleReference` fields. Strategy: on read, each parsed entry is checked for `resourceType`; entries lacking it are silently dropped. No active migration script — stale entries naturally expire or are cleared by the existing "clear recents" action.

## Risks / Trade-offs

- **Stale localStorage entries dropped silently** → Users who have recent patients stored before deployment will see an empty recents list after upgrade. Mitigation: acceptable for a dev tool; document in CHANGELOG.
- **`patientId` now requires parsing `json`** → A small runtime cost where subject construction needs the patient ID from a package bundle. Mitigation: the parse is fast (already-deserialized small bundle); add a helper `getPatientIdFromBundleJson(json)` utility if needed.
- **Breaking type change** → All existing call sites require updates. Mitigation: TypeScript will flag every breakage at compile time; the task list covers all known sites.

## Open Questions

- Should `getPatientIdFromBundleJson` be a helper in `recentPatientsStore.ts` or `packageBundleExtractor.ts`? Likely the extractor since it's package-specific logic.
- Should the stale-entry drop emit a `console.warn` for debuggability, or fail silently?
