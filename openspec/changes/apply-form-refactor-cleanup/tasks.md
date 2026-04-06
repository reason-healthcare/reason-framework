## 1. Extract FHIR context utilities to dedicated module

- [x] 1.1 Create `packages/cpg-review/src/app/utils/fhirContextDeriver.ts` and move all pure utilities from `SelectedPatientPreviewCard.tsx` into it: `parseBundle`, `parseRawJson`, `normalizeIdentifierUse`, `isMrnIdentifier`, `mrnValue`, `formatAddress`, `getPatientId`, `stripHistorySuffix`, `referenceAliases`, `buildPatientReferenceSet`, `matchesSubjectReference`, `deriveContext`, and the `DerivedContext` / `BundleResourceEntry` interfaces
- [x] 1.2 Update `SelectedPatientPreviewCard.tsx` to import all utilities from `utils/fhirContextDeriver` and remove the inline implementations
- [x] 1.3 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve any type errors

## 2. Remove duplicate endpoint state from ApplyForm

- [x] 2.1 Remove the four endpoint `useState` declarations from `ApplyForm` (`cpgEngineEndpointPayload`, `contentEndpointPayload`, `txEndpointPayload`, `dataEndpointPayload`) and their hardcoded default initialisers (retained `dataEndpointPayload` only — needed reactively by `PatientLoadModeSwitcher`)
- [x] 2.2 Add a getter on `EndpointsConfigurationHandle` (e.g. `getConfig(): EndpointsConfig`) so `ApplyForm` can read current endpoint values from `endpointsRef.current` at submit time
- [x] 2.3 Update `handleSubmit` and `handleQuestionnaireSubmit` to read endpoint values via `endpointsRef.current.getConfig()` instead of the removed state variables
- [x] 2.4 Strip the endpoint field assignments (`setCpgEngineEndpointPayload`, etc.) from the `applyPayload` localStorage restoration `useEffect`; retain only `dataPayload` and `subjectPayload` restoration
- [x] 2.5 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve any type errors

## 3. Shared PatientSummary factory

- [x] 3.1 Add `makeBundlePatientSummary(bundle: fhir4.Bundle, patient: fhir4.Patient | undefined, dataPayload: string | undefined): PackagePatientSummary` to `utils/recentPatientsStore.ts`
- [x] 3.2 Replace the inline `PatientSummary` construction in `ApplyForm.handleSubmit` with a call to `makeBundlePatientSummary`
- [x] 3.3 Replace the inline `fallbackSummary` construction in `SelectedPatientPreviewCard` with a call to `makeBundlePatientSummary`
- [x] 3.4 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve any type errors

## 4. Minor fixes

- [x] 4.1 Remove the unreachable `else if (dataEndpointPayload == undefined)` branch in `isValidForm` in `ApplyForm.tsx`
- [x] 4.2 Move `renderPatientName` from `utils/recentPatientsStore.ts` to `helpers.tsx` — **skipped**: `makeBundlePatientSummary` in `recentPatientsStore.ts` uses `renderPatientName` internally making co-location natural; moving it would also require updating 3 test mock files
- [x] 4.3 Update all import sites for `renderPatientName` — **skipped**: see 4.2
- [x] 4.4 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve any type errors

## 5. Validate

- [x] 5.1 Run `cd packages/cpg-review && npx jest --no-coverage` and confirm no new test failures
