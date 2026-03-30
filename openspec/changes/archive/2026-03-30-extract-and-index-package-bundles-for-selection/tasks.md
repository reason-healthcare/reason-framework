# Tasks: Extract and Index Package Bundles for Selection

## 1. Extend PatientSummary Type

- [x] 1.1 Update `packages/cpg-review/src/app/utils/recentPatientsStore.ts`
- [x] 1.2 Extend `PatientSummary` with `source: 'package'`, `bundleId`, `bundleJson`, `resourceCount`, `resourceTypes`, `patientId`
- [x] 1.3 Update `addPatient()` to store `source='package'` under `cpg-review:recent-patients:package`
- [x] 1.4 Update `getAllPatients()` to include package entries alongside manual/endpoint

## 2. Extract Bundles from Resolver

- [x] 2.1 Update `packages/cpg-review/src/app/components/UploadSection.tsx`
- [x] 2.2 Add `extractBundlesFromResolver(resolver)` (implemented in `utils/packageBundleExtractor.ts`)
- [x] 2.3 Add `PackageBundleExtract` interface
- [x] 2.4 In upload success path, extract bundles and `addPatient()` per bundle (no dedupe); include indexed bundle count in success message

## 3. Update RecentPatientsPanel

- [x] 3.1 Update `packages/cpg-review/src/app/components/apply-form/RecentPatientsPanel.tsx`
- [x] 3.2 Show source badges including `From Package`
- [x] 3.3 Show package bundle metadata (`resourceTypes`, `resourceCount`)
- [x] 3.4 On package select, set `dataPayload` from `bundleJson` and keep patient subject selection using `patientId`
- [x] 3.5 Handle missing/invalid `bundleJson` with user-facing error

## 4. Replace Manual JSON Entry with FHIR Bundle Select

- [x] 4.1 Remove the manual JSON textarea and subject-entry workflow from `PatientLoadModeSwitcher`
- [x] 4.2 Replace the current `FHIR Bundle` tab contents with `FHIR Bundle Select`
- [x] 4.3 Render a searchable/selectable list of package bundle displays in that tab
- [x] 4.4 Show one row per bundle with patient name, bundle identifier, and resource metadata
- [x] 4.5 On selection, set `dataPayload` from the chosen package bundle and keep subject aligned to that bundle's patient
- [x] 4.6 Update tests to assert the manual JSON field is no longer rendered

## 5. Wire Resolver Down to RecentPatientsPanel

- [x] 5.1 Pass resolver into `ApplyForm` through `ContentSection`
- [x] 5.2 Pass resolver from `ApplyForm` to `PatientLoadModeSwitcher`
- [x] 5.3 Pass resolver from `PatientLoadModeSwitcher` to `RecentPatientsPanel`
- [x] 5.4 Use resolver fallback when `bundleJson` is missing (`bundleId` lookup)

## 6. Write Unit Tests

- [x] 6.1 Add test: `extractBundlesFromResolver` finds bundles with Patient entries
- [x] 6.2 Add test: `extractBundlesFromResolver` skips bundles without Patient
- [x] 6.3 Add test: Upload flow calls `addPatient` once per package bundle
- [x] 6.4 Add test: `RecentPatientsPanel` renders `From Package` badge
- [x] 6.5 Add test: selecting package entry sets `dataPayload`
- [x] 6.6 Add test: package patient persists to `recent-patients:package`

## 7. Integration Test: Upload → Select → Preview

- [x] 7.1 Add integration test in `ApplyForm.integration.test.tsx` for package bundle selection flow
- [x] 7.2 Verify indexed package entry appears in recent tab and can be selected
- [x] 7.3 Verify preview content comes from selected package bundle
- [x] 7.4 Verify `dataPayload` is set to selected bundle JSON

## Validation Run

- [x] `cd packages/cpg-review && npx tsc --noEmit`
- [x] `cd packages/cpg-review && npx jest --no-coverage` (8 suites, 54 tests passing)

## Acceptance Criteria Delta

- [x] Manual JSON entry field is removed from the apply form
- [x] `FHIR Bundle Select` appears as the local bundle-selection mode
- [x] Package bundles are browsed/selected from that tab, not only through `Recent`
