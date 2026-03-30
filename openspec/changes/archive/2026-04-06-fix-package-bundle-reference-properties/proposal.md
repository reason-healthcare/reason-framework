## Why

The `packageBundleExtractor` incorrectly assigns FHIR reference properties by using the full reference string ("Bundle/123") for both `bundleId` and `bundleCanonical`. In FHIR R4, Bundles are not canonical resources and don't have canonical URLs. The `bundleId` should contain only the resource ID, and a separate `bundleReference` property should store the full FHIR reference to enable proper resource resolution.

## What Changes

- Change `bundleId` to store only the resource ID (extracted from `resource.id`) instead of the full reference string
- Remove the `bundleCanonical` property from `PackageBundleExtract` interface (Bundles are not canonical resources in FHIR R4)
- Add `bundleReference` property to store the full FHIR reference string (e.g., "Bundle/123") for resolver lookups
- Update all usages of these properties in extractor, store, selection panel, and tests
- Ensure PatientSummary's `id` field uses the correct value for proper reference reconstruction

## Capabilities

### New Capabilities
<!-- No new capabilities -->

### Modified Capabilities

- `recent-patients-tab`: Package bundle extraction now correctly separates resource ID from FHIR reference, and removes incorrect canonical property

## Impact

- `packages/cpg-review/src/app/utils/packageBundleExtractor.ts` - Interface and extraction logic
- `packages/cpg-review/src/app/utils/recentPatientsStore.ts` - PatientSummary interface may need bundleReference
- `packages/cpg-review/src/app/components/apply-form/PatientSelectionPanel.tsx` - Resolver fallback lookup
- `packages/cpg-review/tests/utils/recentPatientsStore.test.ts` - Test assertions
- `packages/cpg-review/tests/components/UploadSection.test.tsx` - Mock data structure
- `packages/cpg-review/tests/components/PatientSelectionPanel.test.tsx` - Mock data structure
- `packages/cpg-review/tests/components/ApplyForm.integration.test.tsx` - Integration test data
