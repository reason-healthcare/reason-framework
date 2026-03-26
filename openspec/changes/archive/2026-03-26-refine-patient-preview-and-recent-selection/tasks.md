## 1. Selected Patient Preview UI

- [x] 1.1 Add a selected patient preview component in the apply patient-context area that renders only when active context exists
- [x] 1.2 Implement preview tabs for `Overview`, `Medications`, `Conditions`, and `Raw JSON` with deterministic empty states for missing data
- [x] 1.3 Add a clear selected patient action that resets active patient context without clearing recent history

## 2. Recent Patient Selection Behavior

- [x] 2.1 Update recent patients list items to expose an explicit selection affordance (click + keyboard)
- [x] 2.2 Route recent selection through the shared patient-context activation path and update `addedAt`
- [x] 2.3 Ensure recent selection hydrates and displays the selected patient preview card

## 3. Validation

- [x] 3.1 Add/update unit tests for preview-card rendering, tab switching, and clear action behavior
- [x] 3.2 Add/update unit tests for recent patient selection and keyboard accessibility
- [x] 3.3 Run `cd packages/cpg-review && npx tsc --noEmit`
- [x] 3.4 Run `cd packages/cpg-review && npx jest --no-coverage`