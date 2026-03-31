## Context

The current recommendation flow in `cpg-review` issues one `/api/recommend` request per questionnaire item from `RecommendationPanel`. This causes repeated transfer of the same context bundle, increases request fan-out for larger questionnaires, and can surface higher latency/failure variance with local model runtimes.

A single giant prompt for all items reduces network overhead but risks context bloat and malformed large JSON outputs. A chunked batch strategy provides a middle ground: fewer calls than per-item mode while preserving bounded prompt and response sizes.

## Goals / Non-Goals

**Goals:**
- Submit recommendations in chunks of questionnaire items (for example 5–10 items per call) with shared context.
- Return deterministic output keyed by `linkId` for stable UI mapping.
- Preserve per-item error envelopes in batch responses so partial failures are isolated.
- Keep batch behavior bounded and configurable enough to avoid giant-prompt instability.

**Non-Goals:**
- A single unbounded prompt for all questionnaire items.
- Streaming token output in this change.
- Long-term caching, precomputation, or persistence of recommendations.
- Changing recommendation card UX semantics (loading/success/error) beyond transport-level batching.

## Decisions

### 1) Introduce batch request contract keyed by `linkId`
- **Decision:** Add a batch request shape with `items[]`, shared `context`, optional `questionnaire`, and a response map keyed by item `linkId`.
- **Rationale:** Deterministic keys avoid index-order coupling and simplify robust mapping back to UI cards.
- **Alternative considered:** Positional arrays only. Rejected due to fragility when items are filtered or reordered.

### 2) Process recommendations in bounded chunks
- **Decision:** Partition items into chunk size `N` (default in the 5–10 range) and process each chunk through one provider call that submits a single multi-item prompt with shared context.
- **Rationale:** Keeps prompt/JSON output bounded while reducing both network overhead and model invocation count versus per-item prompting.
- **Alternative considered:** One giant all-items prompt. Rejected because malformed large JSON and context-window pressure become likely as questionnaire size grows.

### 3) Add parse-failure fallback for chunk outputs
- **Decision:** If chunk JSON cannot be parsed or violates schema, retry using smaller chunks (or per-item fallback for that failed chunk) while preserving successful chunk results.
- **Rationale:** Multi-item prompts improve efficiency but increase blast radius of malformed output; bounded fallback preserves resiliency.
- **Alternative considered:** Fail whole request on first malformed chunk. Rejected due to poor user experience and loss of partial successes.

### 4) Preserve per-item error isolation
- **Decision:** Batch responses include per-linkId recommendation payloads with optional per-item `error` values; failures in one item do not invalidate successful items.
- **Rationale:** Prevents all-or-nothing failures and maintains current UI behavior expectations.
- **Alternative considered:** Fail the entire batch on any parse failure. Rejected due to poor resiliency.

### 5) Keep compatibility path for single-item usage
- **Decision:** Existing single-item `/api/recommend` behavior remains supported during migration, with UI progressively switching to batch mode.
- **Rationale:** Reduces rollout risk and allows staged adoption/testing.
- **Alternative considered:** Hard cut-over to batch-only endpoint. Rejected to avoid unnecessary migration breakage.

## Risks / Trade-offs

- **[Risk] Chunk size too large can still produce unstable JSON** → **Mitigation:** enforce conservative default chunk size and validate parse robustness.
- **[Risk] Chunk size too small limits performance gains** → **Mitigation:** make chunk size configurable and benchmark against representative questionnaires.
- **[Risk] Deterministic key collisions or missing linkIds** → **Mitigation:** validate unique/non-empty linkIds before batching and return explicit errors for invalid inputs.
- **[Risk] Multi-item chunk output malformed JSON** → **Mitigation:** implement split-retry fallback for failed chunks and preserve successful chunk outputs.
- **[Trade-off] More complex API contract than single-item mode** → **Mitigation:** document schemas clearly and keep response envelope consistent with existing fields.

## Migration Plan

1. Define batch request/response types and API requirements.
2. Implement batch/chunk route behavior using one multi-item model invocation per chunk while retaining single-item compatibility.
3. Add chunk parse-failure fallback (split/retry smaller chunks or per-item fallback for failed chunk).
4. Update `RecommendationPanel` request strategy to submit chunks and reconcile per-item results by `linkId`.
5. Add tests for chunk boundaries, deterministic mapping, multi-item prompt behavior, and fallback partial failures.
6. Roll out with default chunk size and tune based on local-model latency/quality observations.

Rollback: revert UI to per-item calls and disable batch route logic while preserving prior single-item contract.

## Open Questions

- Should batch transport be a new endpoint (`/api/recommend-batch`) or batch mode on `/api/recommend`?
- What default chunk size best balances latency vs JSON reliability for the target local model(s)?
- Should chunks be processed sequentially for predictability or with limited parallelism for throughput?
- Do we need explicit ordering metadata in the response in addition to `linkId` keys?
