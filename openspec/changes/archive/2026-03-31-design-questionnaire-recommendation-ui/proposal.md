## Why

Clinicians completing questionnaires have no contextual decision support at the point of entry. Now that an LLM recommendation API contract exists (`design-llm-integration-architecture`), we can surface a recommended answer with rationale and confidence below the Smart Forms renderer — giving users a signal without disrupting their ability to freely enter answers.

## What Changes

- A new `RecommendationPanel` component is added to `packages/cpg-review` and rendered below `BaseRenderer` inside `QuestionnaireRenderer`.
- The panel calls `/api/recommend` for each questionnaire item and displays the returned recommended answer, rationale, and confidence score.
- Four visual states are handled: loading, success, low-confidence (confidence < 0.5), and error.
- No accept/reject interactions in this version — the panel is purely informational.

## Capabilities

### New Capabilities

- `questionnaire-recommendation-panel`: The UI component responsible for fetching and displaying per-item LLM recommendations below the Smart Forms renderer, including all display states (loading, success, low-confidence, error/unavailable).

### Modified Capabilities

_(none — no existing spec-level behavior is changing)_

## Impact

- **`packages/cpg-review/src/app/components/apply-form/QuestionnaireRenderer.tsx`**: Renders `RecommendationPanel` below `BaseRenderer`. Passes `questionnaire` and `questionnaireResponseServer` as the source of items to recommend against.
- **No changes** to `ApplyForm`, `/api/apply`, or the Smart Forms renderer internals.
- **Depends on** `/api/recommend` route from `design-llm-integration-architecture`.
- **No new dependencies** required beyond what the architecture change introduces.
