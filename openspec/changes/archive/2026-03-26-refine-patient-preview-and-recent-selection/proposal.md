## Why

The patient context flow currently lacks a clear "selected patient" preview and quick deselection action, and the Recent tab is effectively read-only in practice. Users need a fast way to confirm active context details, inspect key clinical slices, and switch context from recents without reloading through other modes.

## What Changes

- Add a selected patient preview card in the patient context panel with a clear action.
- Add preview tabs inside the selected patient card for `Overview`, `Medications`, `Conditions`, and `Raw JSON`.
- Ensure recent patient entries are actionable selectors (not read-only) and load the selected patient into active apply context.
- Keep patient context interactions aligned with existing apply-form state and recent-patient persistence behavior.

## Capabilities

### New Capabilities
- `selected-patient-preview`: Selected patient card with clear action and tabbed context views.

### Modified Capabilities
- `recent-patients-tab`: Recent entries become explicit selection actions that set active context and hydrate the selected patient preview.

## Impact

- `packages/cpg-review/src/app/components/apply-form/PatientContextPanel.tsx` (or equivalent patient context container)
- `packages/cpg-review/src/app/components/apply-form/RecentPatientsPanel.tsx`
- New preview UI component(s) for selected patient card and tabbed detail rendering
- Patient context unit tests in `packages/cpg-review/src/app/components/apply-form/*.test.tsx`