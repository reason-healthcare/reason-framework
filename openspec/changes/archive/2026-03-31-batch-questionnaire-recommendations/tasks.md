## 1. Batch API types and request validation

- [x] 1.1 Define batch request/response types keyed by `linkId` in `packages/cpg-review/src/app/types/recommendation.ts`
- [x] 1.2 Extend `/api/recommend` request validation to accept either single-item mode (`item`) or batch mode (`items[]`) with shared `context`
- [x] 1.3 Add validation for unique/non-empty `linkId` values in batch mode and return HTTP 400 on invalid input

## 2. Chunked provider execution

- [x] 2.1 Implement chunk partitioning utility with configurable default chunk size (target range 5–10)
- [x] 2.2 Add batch recommendation execution path that processes each chunk and maps outputs by `linkId`
- [x] 2.3 Ensure per-item error isolation: parse/runtime failures populate only affected item entries

## 3. Recommendation panel integration

- [x] 3.1 Refactor `RecommendationPanel` to submit recommendations in chunks instead of one request per item
- [x] 3.2 Map batch responses back into existing per-item UI state using deterministic `linkId` keys
- [x] 3.3 Preserve existing loading/success/error rendering semantics for each item card

## 4. Tests and verification

- [x] 4.1 Add route/provider tests for batch validation, chunk boundaries, deterministic key mapping, and partial failure behavior
- [x] 4.2 Update component tests to assert chunked/batch fetch behavior and correct per-item reconciliation
- [x] 4.3 Run `npm --workspace @reason-framework/cpg-review exec tsc --noEmit`
- [x] 4.4 Run `npm --workspace @reason-framework/cpg-review run test -- --no-coverage`

## 5. Multi-item prompt execution refinement

- [x] 5.1 Add provider/prompt-builder support for chunk-level multi-item prompting (one model invocation per chunk)
- [x] 5.2 Define and enforce deterministic multi-item output schema keyed by `linkId` in provider parsing
- [x] 5.3 Implement bounded fallback for malformed chunk output (split/retry smaller chunks or per-item fallback for failed chunk)
- [x] 5.4 Add route/provider tests proving one model invocation per chunk and fallback preservation of successful chunk results
- [x] 5.5 Re-run `npm --workspace @reason-framework/cpg-review exec tsc --noEmit`
- [x] 5.6 Re-run `npm --workspace @reason-framework/cpg-review run test -- --no-coverage`
