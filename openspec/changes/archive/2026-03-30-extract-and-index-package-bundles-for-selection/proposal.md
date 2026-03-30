## Why

The apply form previously required users to paste or type manual FHIR Bundle JSON to work with local patient context from an uploaded package. That workflow was brittle, hard to inspect, and disconnected from the package contents that had already been loaded into the browser. Users also needed a clear way to browse all patient bundles packaged in the uploaded IG, select one directly, and reuse previously selected package bundles from recents without polluting the Recent tab with every bundle found in the upload.

## What Changes

- Replace the old manual JSON patient-entry workflow with a **FHIR Bundle Select** mode in the patient context switcher.
- Extract patient-containing FHIR `Bundle` resources from the uploaded package resolver and index them as a **package catalog** for browsing.
- Render a searchable patient selection panel that is reused for both the package bundle catalog and the recent-patients history.
- On package bundle selection, populate the apply form `dataPayload` from the stored bundle JSON and set `subject` from the package bundle's patient.
- Persist only **user-selected** package bundles to recent history while keeping the full uploaded bundle inventory in a separate package catalog store.
- Add tests covering bundle extraction, package-bundle selection, bundle payload hydration, resolver fallback, and integration from upload to preview.

## Capabilities

### Modified Capabilities
- `patient-load-mode-switcher`: replaces the manual bundle-entry path with `FHIR Bundle`, `FHIR Data Endpoint`, and `Recent` segmented modes; package-bundle availability controls whether the bundle mode is enabled.
- `recent-patients-tab`: distinguishes uploaded package bundle inventory from true recent history, supports package-specific metadata and selection behavior, and keeps recent entries actionable and keyboard accessible.
- `selected-patient-preview`: reflects package-selected patients using the loaded bundle payload and shows bundle-sourced selections as `From FHIR Bundle`.

## Impact

- `packages/cpg-review/src/app/components/UploadSection.tsx`
- `packages/cpg-review/src/app/utils/packageBundleExtractor.ts`
- `packages/cpg-review/src/app/utils/recentPatientsStore.ts`
- `packages/cpg-review/src/app/components/apply-form/PatientLoadModeSwitcher.tsx`
- `packages/cpg-review/src/app/components/apply-form/PatientSelectionPanel.tsx`
- `packages/cpg-review/src/app/components/apply-form/SelectedPatientPreviewCard.tsx`
- `packages/cpg-review/tests/components/*.test.tsx`
- `packages/cpg-review/tests/utils/*.test.ts`
