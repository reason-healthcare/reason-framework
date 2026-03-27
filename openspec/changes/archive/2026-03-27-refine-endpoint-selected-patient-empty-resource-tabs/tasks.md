## 1. Source-Aware Empty-State UX

- [x] 1.1 Update selected patient preview tab rendering to detect endpoint-selected context and show endpoint-specific empty-state copy for `Medications`, `Conditions`, and `Observations` when those resources are not loaded.
- [x] 1.2 Preserve current resource-list rendering and status display when resources exist, regardless of source.
- [x] 1.3 Preserve generic deterministic empty-state behavior for manual/bundle contexts when no resources are present.

## 2. Tests and Validation

- [x] 2.1 Add/adjust component tests to cover endpoint-selected source with no medications, conditions, and observations loaded, asserting endpoint-specific empty-state text per tab.
- [x] 2.2 Add/adjust component tests to ensure manual/bundle flows continue to show existing list and empty-state behavior.
- [x] 2.3 Run `cd packages/cpg-review && npx tsc --noEmit` and resolve any type errors introduced by this change.
- [x] 2.4 Run `cd packages/cpg-review && npx jest --no-coverage` and confirm no new test failures are introduced.