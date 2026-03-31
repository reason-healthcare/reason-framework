## Why

Users answering clinical questionnaires lack decision support at the point of entry. We need a lightweight architecture that lets the UI call an LLM for a recommended answer, rationale, and confidence score per questionnaire item — without locking the system to a single provider or bloating the `cpg-review` package.

## What Changes

- A thin `LLMProvider` interface and a local Ollama-based implementation are added to `packages/cpg-review`.
- A new Next.js API route (`/api/recommend`) accepts a questionnaire item plus patient context and returns a structured recommendation response.
- A prompt-builder utility constructs the LLM prompt from questionnaire item metadata and available patient context.
- Error and timeout handling is defined at the API route boundary so UI components receive a consistent response shape regardless of provider failure.
- Architecture is intentionally kept inside `cpg-review` for now; extraction to a shared package is deferred until a second consumer exists.

## Capabilities

### New Capabilities

- `llm-provider-interface`: A minimal TypeScript interface (`LLMProvider`) with a single async method, plus a local Ollama implementation. Swapping providers means swapping the implementation behind the interface.
- `questionnaire-recommendation-api`: The `/api/recommend` route — request shape (questionnaire item + patient context), response shape (recommended answer + rationale + confidence + optional error), timeout and error envelope.
- `recommendation-prompt-builder`: Utility that maps a `fhir4.QuestionnaireItem` and patient context bundle to a prompt string suitable for any provider.

### Modified Capabilities

_(none — no existing spec-level behavior is changing)_

## Impact

- **`packages/cpg-review`**: New files only — API route, provider interface, local-provider implementation, prompt builder. No changes to existing apply flow.
- **Dependencies**: Local provider client logic for Ollama HTTP calls (no hosted SDK required for default path).
- **Environment**: `OLLAMA_BASE_URL` and `OLLAMA_MODEL` configurable; no hosted API key required for default local path.
- **Downstream changes**: `implement-llm-recommendation-service` and `implement-questionnaire-recommendation-engine-integration` both depend on this contract.
