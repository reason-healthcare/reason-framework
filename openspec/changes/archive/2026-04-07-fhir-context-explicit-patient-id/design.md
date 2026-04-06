## Context

`fhirContextDeriver.ts` is a pure utility module that extracts FHIR bundle traversal logic from `SelectedPatientPreviewCard`. Its primary export is `deriveContext(bundle, subjectPayload, patientId?)`, which produces typed, patient-scoped clinical resources from an arbitrary FHIR bundle.

Currently, patient identity moves through the system as a raw reference string (`"Patient/Patient1"`). Consumers parse it to extract an ID, pass it back into the deriver, and the deriver rebuilds a reference string internally — redundant round-trips that introduce silent fallback paths:

```ts
// Current — three callers, each parsing the same string differently
const patientId = getPatientId(subjectPayload)          // parse
deriveContext(bundle, subjectPayload, patientId)          // re-join internally
`Patient/${getPatientIdFromBundleJson(json) ?? summary.id}` // ?? fallback
```

The core problem: there is no single typed value that represents "this is a Patient with this ID" — it's assembled, guessed, and re-parsed at every boundary.

## Goals / Non-Goals

**Goals:**
- Export a `ResourceIdentifier { resourceType: string; id: string }` type from `fhirContextDeriver` as the canonical typed identity for any FHIR resource
- `deriveContext` and `buildPatientReferenceSet` accept `subject: ResourceIdentifier` instead of separate `subjectPayload: string` + `patientId: string` params; reference strings are constructed internally from `resourceType` and `id`
- Remove `getPatientId` from the public API entirely — no string parsing needed anywhere
- All `onPatientSelect` callbacks in the patient selection flow (`PatientLoadModeSwitcher`, `FhirPatientSearchPanel`, `PatientSelectionPanel`) pass `ResourceIdentifier` instead of a subject reference string
- `SelectedPatientPreviewCard` receives `subject: ResourceIdentifier | undefined` instead of `subjectPayload: string | undefined`
- `ApplyForm` state tracks `patientSubject: ResourceIdentifier | undefined`; the reference string `Patient/<id>` is only assembled at the API call site
- All `?? fallback` ID chains are removed — if a patient ID cannot be determined from explicit data, the operation does not proceed

**Non-Goals:**
- Changing the alias expansion strategy (`referenceAliases`, `stripHistorySuffix`) — this is working correctly
- Changing the shape of the API payload sent to `/api/apply` — `subjectPayload` remains a string at the network boundary
- Adding new FHIR resource types to `DerivedContext`

## Decisions

### Export `ResourceIdentifier` from `fhirContextDeriver`

A lightweight struct `{ resourceType: string; id: string }` is the canonical representation. It lives in `fhirContextDeriver` because that module owns the matching logic that consumes it. Consumers import the type alongside the functions they already import.

_Alternative considered_: Define it in a shared `types.ts`. Rejected — unnecessary indirection; the type is only needed in the context derivation boundary.

### Replace string params with `ResourceIdentifier` in `deriveContext` and `buildPatientReferenceSet`

Instead of `deriveContext(bundle, subjectPayload: string, patientId: string)`, the signature becomes `deriveContext(bundle, subject: ResourceIdentifier)`. The reference string `Patient/<id>` is assembled internally as `` `${subject.resourceType}/${subject.id}` ``. This removes the need for any regex parsing at call sites.

_Alternative considered_: Make `patientId` required but keep `subjectPayload`. Rejected — still a string, callers still split and rejoin the same data.

### Remove `getPatientId` from the public API

With `ResourceIdentifier` in place, `getPatientId` has no remaining callers. Removing rather than privatising it tightens the module boundary.

### `onPatientSelect` callback carries `ResourceIdentifier` instead of a subject string

`PatientLoadModeSwitcher`, `FhirPatientSearchPanel`, and `PatientSelectionPanel` currently construct subject strings by interpolating `Patient/${id}`. With `ResourceIdentifier`, they construct `{ resourceType: 'Patient', id }` instead. The string is no longer needed until the API boundary in `ApplyForm.handleSubmit`.

### No ID fallback — explicit failure over silent guess

`PatientSelectionPanel` currently uses `getPatientIdFromBundleJson(bundleJson) ?? summary.id` as a fallback. `summary.id` in a `PackagePatientSummary` is the Bundle ID, not a Patient ID — using it silently as a subject reference is a correctness bug. The fallback is removed; if `getPatientIdFromBundleJson` returns `undefined`, the selection does not proceed.

## Risks / Trade-offs

- **Compile-time breakage at all callers** — intentional and desirable. TypeScript will surface every callback and prop that needs updating across the selection flow.
- **Endpoint-only mode (no Patient in bundle)** — `SelectedPatientPreviewCard` receives `subject` but the bundle may be empty. `deriveContext` will return `patient: undefined` and empty arrays, which is correct — the card still renders from the `selectedPatient` summary passed alongside it.
- **`subjectPayload` default `'Patient/Patient1'`** — the `ApplyForm` initial state had a hardcoded default. Removing it means the form starts with no patient selected (correct behaviour). Dev testing that relied on the default will need explicit selection.

## Open Questions

_(none — the change is well-scoped)_
