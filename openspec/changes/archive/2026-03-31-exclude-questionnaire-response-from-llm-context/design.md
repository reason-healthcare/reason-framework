## Context

The recommendation flow in `cpg-review` currently passes a synthetic context bundle containing only `questionnaireResponseServer` into `RecommendationPanel`. The LLM prompt builder (`buildRecommendationPrompt`) expects patient and clinical entries in `context`, but receives questionnaire-response-only data, so patient context is missing.

The selected patient context bundle already exists in `ApplyForm` as `dataPayload` and is used for `$apply`. This change aligns recommendation context with that existing data source.

## Goals / Non-Goals

**Goals:**
- Ensure recommendation requests use the selected data bundle as `context`.
- Exclude `QuestionnaireResponse` from recommendation `context` payloads.
- Preserve questionnaire metadata usage (`questionnaire` prop and item definitions) for recommendation generation.
- Maintain existing `/api/recommend` request shape and UI behavior.

**Non-Goals:**
- Changing `/api/recommend` response contract.
- Reworking recommendation rendering states or confidence thresholds.
- Adding batching, throttling, or new recommendation UX interactions.

## Decisions

### 1) Source recommendation context from `ApplyForm` data payload
- **Decision:** Parse and pass the selected bundle from `dataPayload` through `QuestionnaireRenderer` to `RecommendationPanel`.
- **Rationale:** `dataPayload` is already the canonical patient context used for apply; reusing it avoids divergent context sources.
- **Alternative considered:** Keep constructing context in `QuestionnaireRenderer` from `questionnaireResponseServer`. Rejected because it omits patient/clinical resources.

### 2) Keep questionnaire separate from context
- **Decision:** Continue sending `questionnaire` in the recommendation request body while keeping `context` limited to the data bundle.
- **Rationale:** Questionnaire structure is required for item semantics, but questionnaire responses should not be treated as patient context.
- **Alternative considered:** Merge questionnaire response into context bundle. Rejected due to prompt contamination and mismatch with intended context contract.

### 3) Handle missing or invalid data payload defensively
- **Decision:** If a bundle cannot be derived from `dataPayload`, pass an empty collection bundle to preserve type/flow and avoid runtime crashes.
- **Rationale:** Keeps recommendation panel resilient while still allowing questionnaire completion.
- **Alternative considered:** Disable recommendations entirely when bundle missing. Deferred for future UX refinement.

## Risks / Trade-offs

- **[Risk] Stale context if patient payload changes after questionnaire step mount** → **Mitigation:** Ensure `RecommendationPanel` effect depends on `context` reference and re-fetches when context changes.
- **[Risk] Parsing failures from malformed stored payloads** → **Mitigation:** Guard parsing in `ApplyForm` and fall back safely.
- **[Trade-off] Excluding questionnaire responses may remove potentially useful hints** → **Mitigation:** Keep this boundary explicit for correctness; revisit as an intentional, scoped enhancement later.

## Migration Plan

1. Extend `QuestionnaireRenderer` props to accept recommendation context bundle.
2. In `ApplyForm`, derive recommendation context from `dataPayload` and pass to `QuestionnaireRenderer`.
3. Remove questionnaire-response-derived context construction from `QuestionnaireRenderer`.
4. Keep `RecommendationPanel` request body unchanged (`{ item, context, questionnaire }`) with updated `context` source.
5. Validate via typecheck and component tests.

Rollback: revert prop wiring and restore prior `QuestionnaireRenderer` inline context construction.

## Open Questions

- If both `dataPayload` and data-endpoint mode are in use without a local bundle, should recommendations be hidden or continue with empty context?
- Should future versions provide a UI indicator when recommendation context lacks patient entries?
