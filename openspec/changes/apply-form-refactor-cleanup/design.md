## Context

The `apply-form` feature (epic: `apply-form-patient-data-loading`) was built iteratively over several commits. The resulting code has five areas of redundancy or over-complication identified during exploration:

1. `SelectedPatientPreviewCard.tsx` (657 lines) contains ~400 lines of pure FHIR bundle utilities inline — none of them import React. They are untestable in isolation unless extracted.
2. `ApplyForm` owns four endpoint `useState` values and a `useEffect` that restores them from `applyPayload` localStorage. `EndpointsConfiguration` is the true owner of endpoint persistence (`endpointsConfig` key) and fires its own callbacks on mount — the `ApplyForm` restoration is a no-op that fires first and is silently overridden.
3. `PackagePatientSummary` objects are constructed from the same raw material (bundle + patient resource) in two places: `ApplyForm.handleSubmit` and the `fallbackSummary` block in `SelectedPatientPreviewCard`.
4. The `isValidForm` `else if (dataEndpointPayload == undefined)` branch is unreachable — the preceding guard already returns false when both `dataPayload` and `dataEndpointPayload` are absent.
5. `renderPatientName` is a pure FHIR display formatter living in `recentPatientsStore.ts`, whose concern is persistence, not display.

## Goals / Non-Goals

**Goals:**
- Extract FHIR bundle utilities from `SelectedPatientPreviewCard` into a dedicated, importable module
- Eliminate the duplicate endpoint state management in `ApplyForm`
- Introduce a shared `makeBundlePatientSummary` factory for `PackagePatientSummary` construction
- Remove the dead `isValidForm` branch
- Move `renderPatientName` to `helpers.tsx`
- Zero behaviour change — all existing tests must pass

**Non-Goals:**
- Changing the UI or application logic
- Refactoring anything outside the identified five items
- Adding new test coverage (existing tests cover the extracted code)

## Decisions

### Extract to `utils/fhirContextDeriver.ts`

All pure bundle-traversal utilities from `SelectedPatientPreviewCard` move to a new `utils/fhirContextDeriver.ts`:
- `parseBundle`, `parseRawJson`
- `normalizeIdentifierUse`, `isMrnIdentifier`, `mrnValue`, `formatAddress`
- `getPatientId`, `stripHistorySuffix`, `referenceAliases`
- `buildPatientReferenceSet`, `matchesSubjectReference`, `deriveContext`
- `DerivedContext`, `BundleResourceEntry` interfaces

**Why a new file over adding to `helpers.tsx`:** `helpers.tsx` is already 1400+ lines and mixes display rendering (JSX) with type guards and utilities. FHIR bundle traversal is a distinct enough domain (and these functions are sizeable) to warrant their own module. It also makes them easier to unit test in isolation.

### Remove endpoint state from `ApplyForm`

The four `useState` initialisers for endpoints in `ApplyForm` will be removed and replaced with a single `onEndpointsChange` callback prop from `EndpointsConfiguration`, or simply by dropping the parent state entirely and letting `EndpointsConfiguration` call the payload-assembly handler directly at submit time via the existing `endpointsRef`.

At submit (`handleSubmit`), the payload already reads from the parent `useState` values. After removing those, the submit handler will read from `endpointsRef.current` instead.

The `useEffect` that restores endpoint values from `applyPayload` is removed entirely. The `applyPayload` restoration `useEffect` will keep `dataPayload` and `subjectPayload` restoration (which are legitimately dual-stored) but drop the endpoint fields.

### `makeBundlePatientSummary` factory in `recentPatientsStore`

The `recentPatientsStore` module already owns `PackagePatientSummary`. A small factory `makeBundlePatientSummary(bundle, patient, dataPayload)` is added there, used by both `ApplyForm` and `SelectedPatientPreviewCard` (via its fallback path).

### `renderPatientName` moves to `helpers.tsx`

Import paths in `ApplyForm` and `SelectedPatientPreviewCard` update to `helpers`. The function is removed from `recentPatientsStore`. Any other importers (tests) update their import.

## Risks / Trade-offs

- [Import churn] Moving `renderPatientName` touches multiple files → Mitigation: simple find-replace, TypeScript errors will catch all missed spots
- [Endpoint read at submit] Reading from `endpointsRef.current` at submit instead of synced state could return stale values if the ref is somehow unmounted → Mitigation: `endpointsRef` is mounted for the entire form lifetime; this pattern is already in use for `reset()`

## Open Questions

- None — all decisions above are straightforward refactors with no ambiguity
