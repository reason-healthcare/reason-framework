## Why

Per-item recommendation requests create unnecessary latency, repeated context transfer, and higher failure surface when questionnaires contain many items. A chunked batching model reduces call overhead while preserving bounded prompt size and reliable structured output.

## What Changes

- Add a batched recommendation API contract that accepts multiple questionnaire items in one request with shared patient context.
- Define chunking behavior (for example 5–10 items per chunk) so each chunk is processed as a single multi-item prompt with shared context rather than one prompt per item.
- Require deterministic recommendation output keys by `linkId` to ensure stable UI mapping and partial-result handling.
- Define per-item error envelopes within batch responses so one malformed answer does not fail the whole batch.
- Define parse-failure fallback behavior for chunk outputs (split/retry smaller chunks or per-item fallback) to preserve partial success.
- Update recommendation panel integration behavior to use batched/chunked calls rather than one network call per item.

## Capabilities

### New Capabilities
- `questionnaire-recommendation-batch-api`: Batch/chunk API contract for recommendation requests and deterministic per-item responses keyed by `linkId`.

### Modified Capabilities
- `questionnaire-recommendation-api`: Extend recommendation API requirements to support batched request/response behavior, chunking constraints, and partial per-item errors.

## Impact

- **API surface**: Adds a batch recommendation endpoint (or batch mode contract) in `packages/cpg-review` and updates UI call pattern.
- **LLM provider usage**: Provider execution shifts from per-item model calls to one model call per chunk.
- **Prompting**: Prompt builder will need multi-item chunk framing and deterministic output schema by `linkId`.
- **UI mapping**: `RecommendationPanel` state updates map batch results back to item cards using `linkId` keys.
- **Validation/testing**: New unit/integration coverage required for chunking, deterministic output mapping, and partial failure handling.
