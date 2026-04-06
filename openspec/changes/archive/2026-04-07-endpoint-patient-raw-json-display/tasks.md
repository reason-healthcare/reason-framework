## 1. Update FhirPatientSearchPanel

- [x] 1.1 In `FhirPatientSearchPanel.tsx` `handleChange`, remove the `bundle` and `bundleJson` variable construction entirely; set `summary.json = JSON.stringify(patientResource)`; change the `onPatientSelect` call to pass `undefined` as the third argument (no `dataPayload` for endpoint patients)

## 2. Update SelectedPatientPreviewCard

- [x] 2.1 In `SelectedPatientPreviewCard.tsx`, replace the `parseRawJson(dataPayload)` call for `rawFhirPayload` with `parseRawJson(selectedPatient?.json || dataPayload)` — source-agnostic; uses the stored patient JSON with `dataPayload` as fallback for the resolver-fallback edge case
- [x] 2.2 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve any type errors

## 3. Update tests

- [x] 3.1 In `tests/components/FhirPatientSearchPanel.test.tsx`, update assertions so that: (a) `addPatient` is called with `json` equal to `JSON.stringify(patient)` (a `Patient` resource, not a Bundle wrapper), and (b) `onPatientSelect` is called with `undefined` as the third argument (no `dataPayload`)
- [x] 3.2 Add a test to `tests/components/SelectedPatientPreviewCard.test.tsx` verifying that when `selectedPatient.json` is populated (endpoint or package), the Raw JSON tab renders that JSON
- [x] 3.3 Add a test to `tests/components/SelectedPatientPreviewCard.test.tsx` verifying that when `selectedPatient.json` is absent/falsy, the Raw JSON tab falls back to rendering `dataPayload`
- [x] 3.4 Run `cd packages/cpg-review && npx jest --no-coverage` and fix any remaining failures
