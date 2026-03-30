## 1. Update PackageBundleExtract Interface and Extraction Logic

- [x] 1.1 In `packages/cpg-review/src/app/utils/packageBundleExtractor.ts`, update `PackageBundleExtract` interface: change `bundleId` to store only resource ID, remove `bundleCanonical`, add `bundleReference` for full FHIR reference
- [x] 1.2 In `extractBundlesFromResolver`, update the bundle extraction to assign `bundleId: resource.id`, `bundleReference: reference`, and remove `bundleCanonical` assignment
- [x] 1.3 In `indexPackageBundles`, update PatientSummary mapping to use `bundle.bundleReference` for the `id` field display instead of `bundle.bundleCanonical`
- [x] 1.4 Update the `name` field construction to use `bundle.bundleReference` instead of `bundle.bundleCanonical` in the brackets
- [x] 1.5 Pass `bundleReference: bundle.bundleReference` to the PatientSummary object instead of relying on bundleId for resolver lookups

## 2. Update PatientSummary Interface (if needed)

- [x] 2.1 Check `packages/cpg-review/src/app/utils/recentPatientsStore.ts` PatientSummary interface - ensure `bundleId` property documentation is clear it contains resource ID only
- [x] 2.2 Add `bundleReference` property to PatientSummary interface if it doesn't exist

## 3. Update Resolver Fallback Logic

- [x] 3.1 In `packages/cpg-review/src/app/components/apply-form/PatientSelectionPanel.tsx`, update resolver fallback lookup from `resolver.resourcesByReference[summary.bundleId]` to `resolver.resourcesByReference[summary.bundleReference]`

## 4. Update Test Files

- [x] 4.1 In `packages/cpg-review/tests/utils/recentPatientsStore.test.ts`, update mock PatientSummary objects to include `bundleReference` and correct `bundleId` (resource ID only)
- [x] 4.2 In `packages/cpg-review/tests/components/UploadSection.test.tsx`, update PackageBundleExtract mock data to remove `bundleCanonical` and add `bundleReference`
- [x] 4.3 Update assertions in `UploadSection.test.tsx` to check for `bundleReference` instead of `bundleCanonical`
- [x] 4.4 In `packages/cpg-review/tests/components/PatientSelectionPanel.test.tsx`, update mock PatientSummary to include `bundleReference`
- [x] 4.5 In `packages/cpg-review/tests/components/ApplyForm.integration.test.tsx`, update mock PatientSummary to include `bundleReference` with full FHIR reference

## 5. Type Checking and Testing

- [x] 5.1 Run `cd packages/cpg-review && npx tsc --noEmit` and resolve any type errors
- [x] 5.2 Run `cd packages/cpg-review && npx jest --no-coverage` and ensure all tests pass
- [x] 5.3 Verify resolver fallback works correctly by checking PatientSelectionPanel logic manually or with integration test
