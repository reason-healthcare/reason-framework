## 1. Dependencies & Types

- [x] 1.1 Define local runtime provider dependency strategy for `packages/cpg-review` (Ollama HTTP client/no hosted SDK requirement for default path)
- [x] 1.2 Add local runtime env documentation (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`) to environment docs/example files
- [x] 1.3 Define `RecommendationRequest` and `RecommendationResponse` TypeScript types in `packages/cpg-review/src/app/types/recommendation.ts`
- [x] 1.4 Define the `LLMProvider` interface in `packages/cpg-review/src/app/llm/LLMProvider.ts`

## 2. Prompt Builder

- [x] 2.1 Create `packages/cpg-review/src/app/llm/buildRecommendationPrompt.ts` implementing the pure `buildRecommendationPrompt` function
- [x] 2.2 Include questionnaire item `text`, `linkId`, and `answerOption` values in the prompt
- [x] 2.3 Include a minimal patient context summary (demographics and relevant clinical entries) extracted from the context bundle
- [x] 2.4 Instruct the model to respond with a JSON object: `{ recommendedAnswer, rationale, confidence }`
- [x] 2.5 Handle empty context bundles gracefully (no throw, note absence of patient data in prompt)
- [x] 2.6 Write unit tests for `buildRecommendationPrompt` covering: item with answer options, item without answer options, empty bundle, questionnaire title present

## 3. Local Provider

- [x] 3.1 Create `packages/cpg-review/src/app/llm/OllamaProvider.ts` (or equivalent local provider) implementing `LLMProvider`
- [x] 3.2 Configure local model runtime connection via `OLLAMA_BASE_URL` and model selection via `OLLAMA_MODEL`
- [x] 3.3 Call `buildRecommendationPrompt` to construct the prompt and send it to the local model runtime
- [x] 3.4 Parse the model's JSON response into `RecommendationResponse` fields
- [x] 3.5 Catch all errors and return a `RecommendationResponse` with `error` populated instead of throwing
- [x] 3.6 Apply a 10-second timeout to local runtime calls; resolve with an error envelope on timeout

## 4. API Route

- [x] 4.1 Create `packages/cpg-review/src/app/api/recommend/route.ts` as a Next.js `POST` route handler
- [x] 4.2 Validate that `item` and `context` are present in the request body; return HTTP 400 if missing
- [x] 4.3 Check local runtime configuration/reachability; if unavailable return HTTP 200 with `error` populated
- [x] 4.4 Instantiate local `LLMProvider` implementation and call `recommend` with the parsed request body
- [x] 4.5 Return the `RecommendationResponse` as JSON with HTTP 200 in all non-400 cases
- [x] 4.6 Ensure no internal stack traces are exposed in the error response body

## 5. Verification

- [x] 5.1 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve all type errors
- [x] 5.2 Run `cd packages/cpg-review && npx jest --no-coverage` and confirm no new test failures

## 6. Prompt Context Refinement (Normalized Clinical Facts)

- [x] 6.1 Refactor `buildRecommendationPrompt` to keep the existing prompt skeleton while replacing minimal clinical summaries with normalized per-resource fact blocks
- [x] 6.2 Add normalized field extraction for `Observation` (code, value + unit, effective date/time, interpretation, status) with provenance (`resourceType`, `id`, date)
- [x] 6.3 Add normalized field extraction for `Condition` (code, clinicalStatus, verificationStatus, onset, severity) with provenance
- [x] 6.4 Add normalized field extraction for `MedicationStatement` (medication, status, dosage text, effective period) with provenance
- [x] 6.5 Add normalized field extraction for `AllergyIntolerance` (substance, criticality, reaction manifestations) with provenance
- [x] 6.6 Add optional top-N raw JSON snippet support for selected relevant resources only (disabled or bounded by default; no full-bundle raw JSON)
- [x] 6.7 Add/extend prompt-builder unit tests covering each normalized resource block, provenance inclusion, empty-context fallback, and top-N snippet bounding behavior
- [x] 6.8 Re-run `npx tsc --noEmit` and prompt-builder test suite to validate refinements
