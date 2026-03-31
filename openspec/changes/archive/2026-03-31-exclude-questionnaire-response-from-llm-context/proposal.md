## Why

Recommendation requests are currently built with a context bundle that contains only `QuestionnaireResponse`, which omits patient and clinical data from the original data bundle. This causes low-quality recommendations and violates the intended contract that recommendations should be grounded in patient context.

## What Changes

- Recommendation context passed to `/api/recommend` will use the selected patient data bundle as the primary context source.
- `QuestionnaireResponse` will be excluded from recommendation `context` payloads.
- `QuestionnaireRenderer` integration will pass a recommendation context bundle derived from the existing `dataPayload` flow instead of constructing a questionnaire-response-only bundle.
- Recommendation behavior will continue to include questionnaire metadata (`questionnaire` + item details), but not questionnaire response content in context.

## Capabilities

### New Capabilities
- `questionnaire-recommendation-context`: Defines the context composition contract for questionnaire recommendations, including explicit exclusion of questionnaire responses from recommendation context.

### Modified Capabilities
- _(none)_

## Impact

- **`packages/cpg-review/src/app/components/apply-form/ApplyForm.tsx`**: Supplies recommendation context bundle to the questionnaire step from selected data payload.
- **`packages/cpg-review/src/app/components/apply-form/QuestionnaireRenderer.tsx`**: Stops creating a context bundle from `questionnaireResponseServer`; forwards provided data bundle context to `RecommendationPanel`.
- **`packages/cpg-review/src/app/components/apply-form/RecommendationPanel.tsx`**: Continues sending `context` and `questionnaire` to `/api/recommend` with updated context source.
- **`packages/cpg-review/src/app/llm/buildRecommendationPrompt.ts`**: Receives patient/clinical context entries as intended and no longer receives questionnaire-response-only context.
- No API contract change to `/api/recommend` request shape; this is a source-of-truth change for what is placed into `context`.
