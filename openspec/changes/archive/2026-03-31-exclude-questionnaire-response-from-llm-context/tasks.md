## 1. Pass data bundle context through questionnaire flow

- [x] 1.1 Extend `QuestionnaireRenderer` props to accept a recommendation context bundle (`fhir4.Bundle`)
- [x] 1.2 Update `ApplyForm` to derive recommendation context from `dataPayload` and pass it to `QuestionnaireRenderer`
- [x] 1.3 Add defensive fallback to an empty collection bundle when `dataPayload` is missing or invalid

## 2. Remove questionnaire-response-derived context wiring

- [x] 2.1 Remove `QuestionnaireRenderer` inline context bundle construction that wraps `questionnaireResponseServer`
- [x] 2.2 Ensure `RecommendationPanel` receives `context` from the passed recommendation context prop only
- [x] 2.3 Verify `RecommendationPanel` request body remains `{ item, context, questionnaire }`

## 3. Update tests and validate behavior

- [x] 3.1 Update/extend component tests to assert recommendation requests use the selected data bundle context
- [x] 3.2 Add a regression test that questionnaire response is not used to construct recommendation context
- [x] 3.3 Run `npm --workspace @reason-framework/cpg-review exec tsc --noEmit`
- [x] 3.4 Run `npm --workspace @reason-framework/cpg-review run test -- --no-coverage`
