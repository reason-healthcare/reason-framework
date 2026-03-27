## Why

When a patient is selected from a FHIR data endpoint, the selected context often contains only Patient-level data and not related Medication, Condition, or Observation resources. The current preview can make those tabs look like true clinical empties instead of "not fetched," which creates ambiguity for reviewers.

## What Changes

- Add source-aware empty-state behavior in the selected patient preview for `Medications`, `Conditions`, and `Observations`.
- Distinguish between:
  - no matching resources in loaded bundle/manual payload, and
  - endpoint-selected context where related resources were not fetched.
- Keep the `Raw JSON` tab tied to the raw FHIR payload as loaded (no normalization/transformation view).
- Preserve existing behavior when related resources are present in context.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `selected-patient-preview`: Refine tabbed resource empty states to be source-aware for endpoint-selected patients and explicitly communicate when related resources are not loaded.

## Impact

- Affected UI: `packages/cpg-review/src/app/components/apply-form/SelectedPatientPreviewCard.tsx`
- Affected tests: selected patient preview component tests in `packages/cpg-review/tests/components/`
- Affected spec: `openspec/specs/selected-patient-preview/spec.md`