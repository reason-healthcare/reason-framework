## 1. Setup and Imports

- [x] 1.1 Import META constant from NarrativeDisplay or define locally in SelectedPatientPreviewCard
- [x] 1.2 Import formatProperty and notEmpty helpers from helpers.tsx
- [x] 1.3 Verify resolver and navigate are available in component scope (from router context)

## 2. Update Medications Tab Rendering

- [x] 2.1 Remove medicationLabel helper function
- [x] 2.2 Replace medications rendering with property-iteration logic using Object.entries
- [x] 2.3 Apply META filter to exclude META fields from display
- [x] 2.4 Call formatProperty(value, resolver, navigate, key) for each non-META property
- [x] 2.5 Exclude meta.profile field from patient details view
- [x] 2.6 Filter empty results using notEmpty utility

## 3. Update Conditions Tab Rendering

- [x] 3.1 Remove conditionLabel helper function
- [x] 3.2 Replace conditions rendering with property-iteration logic using Object.entries
- [x] 3.3 Apply META filter to exclude META fields from display
- [x] 3.4 Call formatProperty(value, resolver, navigate, key) for each non-META property
- [x] 3.5 Exclude meta.profile field from patient details view
- [x] 3.6 Filter empty results using notEmpty utility

## 4. Update Observations Tab Rendering

- [x] 4.1 Remove observationLabel helper function
- [x] 4.2 Replace observations rendering with property-iteration logic using Object.entries
- [x] 4.3 Apply META filter to exclude META fields from display
- [x] 4.4 Call formatProperty(value, resolver, navigate, key) for each non-META property
- [x] 4.5 Exclude meta.profile field from patient details view
- [x] 4.6 Filter empty results using notEmpty utility

## 5. Update Test Assertions

- [x] 5.1 Update medications tab tests to verify properties are rendered via formatProperty
- [x] 5.2 Add test for META field filtering (verify id/resourceType not displayed)
- [x] 5.3 Update conditions tab tests to verify properties are rendered via formatProperty
- [x] 5.4 Update tests to verify meta.profile is excluded
- [x] 5.5 Update observations tab tests to verify properties are rendered via formatProperty
- [x] 5.6 Add test for navigation links in formatted properties

## 6. Validation

- [x] 6.1 Run npx tsc --noEmit in cpg-review package and resolve type errors
- [x] 6.2 Run focused test suite for SelectedPatientPreviewCard
- [x] 6.3 Run full cpg-review package test suite and ensure no regressions
