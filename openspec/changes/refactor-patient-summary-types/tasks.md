## 1. Refactor PatientSummary types in recentPatientsStore

- [x] 1.1 Replace the `PatientSummary` interface with `BasePatientSummary`, `EndpointPatientSummary`, `PackagePatientSummary`, and the `PatientSummary` union type in `utils/recentPatientsStore.ts`
- [x] 1.2 Add `getPatientIdFromBundleJson(json: string): string | undefined` helper to `utils/recentPatientsStore.ts` (parses stored json and returns the first Patient resource's id)
- [x] 1.3 Update `setPackageCatalog` and `getPackageCatalog` signatures to use `PackagePatientSummary[]`
- [x] 1.4 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve any type errors from the interface change

## 2. Refactor packageBundleExtractor

- [x] 2.1 Remove the `PackageBundleExtract` interface from `utils/packageBundleExtractor.ts`
- [x] 2.2 Update `extractBundlesFromResolver` to return `PackagePatientSummary[]` directly (set `resourceType: 'Bundle'`, `id` = `resource.id`, `json` = `JSON.stringify(resource)`, remove `bundleReference` / `bundleJson`)
- [x] 2.3 Update `indexPackageBundles` to accept and pass through `PackagePatientSummary[]` — remove the intermediate mapping step
- [x] 2.4 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve any type errors

## 3. Update FhirPatientSearchPanel

- [x] 3.1 Update `handleChange` in `FhirPatientSearchPanel.tsx` to include `resourceType: 'Patient'` and `json` (the already-constructed minimal Patient collection bundle serialized as JSON) on the summary object

## 4. Update PatientSelectionPanel

- [x] 4.1 Replace `summary.bundleJson` with `summary.json` in `handleSelect` in `PatientSelectionPanel.tsx`
- [x] 4.2 Replace `summary.bundleReference` with `Bundle/${summary.id}` in the resolver fallback lookup in `PatientSelectionPanel.tsx`
- [x] 4.3 Replace the `summary.patientId` subject construction with `getPatientIdFromBundleJson(summary.json)` for package patients in `PatientSelectionPanel.tsx`
- [x] 4.4 Update the search haystack in `visiblePatients.filter()` to remove `patient.patientId` and `patient.bundleId` (now just `patient.id`)

## 5. Update SelectedPatientPreviewCard

- [x] 5.1 Audit `SelectedPatientPreviewCard.tsx` for any references to `summary.bundleId` and replace with `summary.id` where the summary is a `PackagePatientSummary`

## 6. Update tests

- [x] 6.1 Update `PatientSummary` fixture shapes in `tests/utils/recentPatientsStore.test.ts` (`bundleJson` → `json`, add `resourceType`, remove `bundleReference` / `patientId`)
- [x] 6.2 Update package patient fixture in `tests/components/PatientSelectionPanel.test.tsx` (`bundleJson` → `json`, add `resourceType: 'Bundle'`, `id` = Bundle id, remove `patientId`)
- [x] 6.3 Update `PACKAGE_ENTRY` fixture in `tests/components/ApplyForm.integration.test.tsx` to match new shape
- [x] 6.4 Update `tests/components/UploadSection.test.tsx` to remove `patientId` from any `PackagePatientSummary`-shaped fixture
- [x] 6.5 Run `cd packages/cpg-review && npx jest --no-coverage` and fix any remaining failures
