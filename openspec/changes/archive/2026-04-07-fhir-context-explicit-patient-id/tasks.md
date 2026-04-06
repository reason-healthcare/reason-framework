## 1. Add `ResourceIdentifier` and update `fhirContextDeriver` API

- [x] 1.1 Export `ResourceIdentifier { resourceType: string; id: string }` interface from `fhirContextDeriver.ts`; add JSDoc
- [x] 1.2 Change `buildPatientReferenceSet` signature from `(subjectPayload, patientId, entries)` to `(subject: ResourceIdentifier, entries)` — replace internal uses of `subjectPayload` with the constructed reference `` `${subject.resourceType}/${subject.id}` ``; remove the separate `patientId` seeding block; update JSDoc
- [x] 1.3 Change `deriveContext` signature from `(bundle, subjectPayload, patientId)` to `(bundle, subject: ResourceIdentifier)` — replace `subjectPayload` / `patientId` uses internally; update the patient-matching expression to always match by `subject.id` (remove the `!!patientId ? ... : true` ternary); update the internal `buildPatientReferenceSet` call to pass `subject`; update JSDoc
- [x] 1.4 Remove the `getPatientId` export — delete the function body and JSDoc
- [x] 1.5 Update the module-level JSDoc `Typical usage` comment to reflect the new signatures
- [x] 1.6 Run `npx tsc --noEmit` in `packages/cpg-review` and verify all type errors produced are caller-site breakages (expected), not within the module itself

## 2. Update `onPatientSelect` callback shape

- [x] 2.1 Change `PatientLoadModeSwitcher.onPatientSelect` prop type from `(subject: string, summary, dataPayload?) => void` to `(subject: ResourceIdentifier, summary, dataPayload?) => void`
- [x] 2.2 In `FhirPatientSearchPanel`, replace `onPatientSelect(\`Patient/${row.id}\`, summary, undefined)` with `onPatientSelect({ resourceType: 'Patient', id: row.id }, summary, undefined)`
- [x] 2.3 In `PatientSelectionPanel`, remove the `?? summary.id` fallback — if `getPatientIdFromBundleJson(effectiveBundleJson)` returns `undefined`, return early without calling `onPatientSelect`; otherwise call `onPatientSelect({ resourceType: 'Patient', id: patientId }, summary, effectiveBundleJson)`; for the endpoint case, call `onPatientSelect({ resourceType: 'Patient', id: summary.id }, summary)`
- [x] 2.4 Run `npx tsc --noEmit` and confirm no type errors in these files

## 3. Update `ApplyForm` state and `SelectedPatientPreviewCard` prop

- [x] 3.1 In `ApplyForm.tsx`, rename the `subjectPayload` state to `patientSubject` and change its type from `string | undefined` to `ResourceIdentifier | undefined`; remove the hardcoded `'Patient/Patient1'` default (start as `undefined`)
- [x] 3.2 Update `handlePatientSelect` to accept `subject: ResourceIdentifier` as first argument and call `setPatientSubject(subject)`
- [x] 3.3 In `handleSubmit`, assemble the string: `subjectPayload: patientSubject ? \`${patientSubject.resourceType}/${patientSubject.id}\` : undefined`
- [x] 3.4 In `handleQuestionnaireSubmit`, do the same string assembly for the `subjectPayload` field of the payload
- [x] 3.5 Update the `localStorage` restore `useEffect` — the stored `subjectPayload` string (if present) should be parsed back into `ResourceIdentifier` (split on `/` to extract `resourceType` and `id`); if the stored value cannot be parsed into a valid two-part reference, discard it
- [x] 3.6 Change `SelectedPatientPreviewCard` prop from `subjectPayload: string | undefined` to `subject: ResourceIdentifier | undefined`; update its internal usage — replace `getPatientId(subjectPayload)` with `subject.id`, replace the `subjectPayload` guard with `subject`, call `deriveContext(bundle, subject)`; update `makeBundlePatientSummary` call to pass `subject.id` directly
- [x] 3.7 Update the `<SelectedPatientPreviewCard>` JSX in `ApplyForm` to pass `subject={patientSubject}` instead of `subjectPayload`
- [x] 3.8 Remove the `getPatientId` import from `SelectedPatientPreviewCard.tsx`
- [x] 3.9 Run `npx tsc --noEmit` and confirm no type errors

## 4. Validation

- [x] 4.1 Run `cd packages/cpg-review && npx jest --no-coverage` and confirm no new test failures are introduced
