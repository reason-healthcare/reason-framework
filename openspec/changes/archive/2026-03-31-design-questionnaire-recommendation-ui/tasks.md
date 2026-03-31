## 1. RecommendationPanel Component

- [x] 1.1 Create `packages/cpg-review/src/app/components/apply-form/RecommendationPanel.tsx` with a component that accepts `questionnaire: fhir4.Questionnaire` and `context: fhir4.Bundle` as props
- [x] 1.2 On mount, iterate over all questionnaire items and filter out items with `type: "display"` or `type: "group"` and items marked `hidden: true`
- [x] 1.3 Fire concurrent `POST /api/recommend` calls for each eligible item using `Promise.allSettled` and store per-item state (`loading | success | error`)
- [x] 1.4 Render a labelled section per item using Ant Design `Card` with the item's `text` as the card title
- [x] 1.5 Show an Ant Design `Spin` indicator inside the card while the item's fetch is in-flight
- [x] 1.6 On success, render `recommendedAnswer`, `rationale`, and a confidence badge inside the card
- [x] 1.7 Render confidence as a percentage with Ant Design `Tag`; use `color="warning"` for `confidence < 0.5` and `color="success"` for `confidence >= 0.5`
- [x] 1.8 On error or when `error` is present in the response, render a muted `Typography.Text type="secondary"` message: "Recommendation unavailable"

## 2. QuestionnaireRenderer Integration

- [x] 2.1 Update `QuestionnaireRenderer` to import and render `RecommendationPanel` below `<BaseRenderer />`
- [x] 2.2 Pass the `questionnaire` prop and the current `questionnaireResponseServer` bundle as `context` to `RecommendationPanel`
- [x] 2.3 Ensure `RecommendationPanel` is only mounted when both `questionnaire` and `questionnaireResponseServer` are defined

## 3. Tests

- [x] 3.1 Write a unit test for `RecommendationPanel` that mocks `fetch` to return a success response and asserts that `recommendedAnswer` and `rationale` are rendered
- [x] 3.2 Write a unit test for `RecommendationPanel` that mocks `fetch` to return a response with `error` populated and asserts that "Recommendation unavailable" is shown
- [x] 3.3 Write a unit test that asserts items with `type: "display"` or `type: "group"` do not trigger a fetch call
- [x] 3.4 Write a unit test asserting that `color="warning"` is applied to the confidence tag when `confidence < 0.5`

## 4. Verification

- [x] 4.1 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve all type errors
- [x] 4.2 Run `cd packages/cpg-review && npx jest --no-coverage` and confirm no new test failures
