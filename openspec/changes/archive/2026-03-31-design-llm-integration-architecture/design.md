## Context

`cpg-review` is a Next.js 14 app that runs CPG `$apply` operations and surfaces results. It currently has one API route (`/api/apply`) acting as a proxy to the CPG engine. There is no LLM integration anywhere in the monorepo today. The questionnaire rendering step uses `@aehrc/smart-forms-renderer`'s `BaseRenderer`, which is a controlled third-party component — we cannot inject per-item UI into it. Recommendation display therefore lives *outside* the renderer, below it in the component tree.

The goal is to add LLM-powered recommendations with the smallest footprint that still keeps providers swappable.

## Goals / Non-Goals

**Goals:**
- A single `LLMProvider` TypeScript interface and a local-model implementation (Ollama), both inside `packages/cpg-review`.
- A new `/api/recommend` Next.js route that accepts a questionnaire item + patient context and returns a structured recommendation.
- A prompt-builder utility that constructs the LLM prompt from FHIR questionnaire item metadata and patient context.
- Consistent response envelope whether the call succeeds, times out, or errors.
- Minimal local runtime configuration (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`) with sensible defaults.

**Non-Goals:**
- A runtime provider registry or plugin loader — swapping providers is a code change, not a config change.
- Streaming responses in v1.
- Accept/reject decision persistence.
- Extracting to a shared monorepo package until a second consumer exists.
- Caching or pre-fetching recommendations.

## Decisions

### 1. Keep inside `cpg-review` for now

**Decision:** Add all new code to `packages/cpg-review`. No new package.

**Rationale:** Only one consumer exists; creating a package prematurely adds maintenance overhead (build config, versioning, cross-package imports) with no benefit. The interface boundary means extraction later is a straight file move.

**Extraction trigger:** A second package needs recommendations, OR provider logic grows to couple badly with app-level config (env, auth, secrets).

**Alternative considered:** New `packages/llm-recommendation-service` package from day one. Rejected — premature given current scope.

---

### 2. Thin `LLMProvider` interface — one async method

**Decision:**
```ts
interface LLMProvider {
  recommend(request: RecommendationRequest): Promise<RecommendationResponse>
}
```

`RecommendationRequest`: `{ item: fhir4.QuestionnaireItem; context: fhir4.Bundle; questionnaire?: fhir4.Questionnaire }`

`RecommendationResponse`: `{ recommendedAnswer: string; rationale: string; confidence: number; error?: string }`

**Rationale:** One method is the minimal contract. Everything else (prompt shaping, retry, model params) is an implementation detail of each provider. Keeps the interface stable as providers evolve.

**Alternative considered:** A richer interface with `streamRecommend`, `batchRecommend`. Rejected — YAGNI; add when needed.

---

### 3. Local-model-first via Ollama HTTP API

**Decision:** Use a local Ollama provider as the default implementation. Default model should be a lightweight instruct model suitable for structured JSON output (for example `qwen2.5:7b-instruct`), configurable via environment.

**Rationale:** Eliminates third-party API rate limits and request costs for development workflows, keeps patient data on-device/local network by default, and preserves provider swappability through the same `LLMProvider` interface.

**Alternative considered:** Hosted-provider-first (Gemini/OpenAI). Rejected for v1 recommendation workflow due to frequent free-tier throttling during per-item request fan-out.

---

### 4. `/api/recommend` as the provider boundary

**Decision:** UI components never call the LLM provider directly. All LLM traffic goes through the Next.js API route, which instantiates the local Ollama-backed provider.

**Rationale:** The route remains the seam for provider swaps (local ↔ hosted) while preserving the stable UI contract (`RecommendationRequest` / `RecommendationResponse`).

---

### 5. Prompt builder as a pure utility function

**Decision:** `buildRecommendationPrompt(item, context, questionnaire?)` returns a plain string. No class, no state.

**Rationale:** Pure functions are easy to test and trivially reusable. The prompt builder is not provider-specific — every provider gets the same prompt unless we later introduce provider-specific tuning.

---

### 6. Use normalized clinical facts, not full-bundle raw dumps

**Decision:** Keep the existing prompt skeleton and questionnaire metadata, but enrich patient context with a normalized per-resource block rather than sending the entire FHIR Bundle JSON for every request.

Normalized context should include:
- **Observation**: code, value + unit, effective date/time, interpretation, status
- **Condition**: code, clinicalStatus, verificationStatus, onset, severity
- **MedicationStatement**: medication, status, dosage text, effective period
- **AllergyIntolerance**: substance, criticality, reaction manifestations

Each normalized line should include tiny provenance (`resourceType`, `id`, and best-available clinically relevant date).

**Optional extension:** append raw JSON only for the top-N most relevant resources (small N), not the entire bundle.

**Rationale:** Full bundle payloads add token cost, latency, and noise, especially with local models and per-item requests. Normalized facts preserve clinical signal with predictable prompt size while retaining the ability to include limited raw context when needed.

**Alternative considered:** include the full FHIR bundle or full entry JSON for every request. Rejected for v1 due to context bloat, slower responses, and higher risk of low-signal outputs.

---

### 6. Confidence score as a 0–1 float in the response

**Decision:** Require `confidence: number` (0.0–1.0) in `RecommendationResponse`. For v1 Gemini implementation, derive confidence from the model's explicit self-assessment in the prompt output (ask the model to score its confidence as part of the structured response).

**Rationale:** Confidence is in scope for v1 UI. Asking the model to self-report is the simplest path; replace with logprob-based scoring if Gemini exposes it in a future iteration.

---

## Risks / Trade-offs

- **Local model latency and hardware variability** → Response time depends on developer machine capacity. Keep timeout/error envelope behavior and allow model downgrades for slower hardware.
- **Ollama availability** → If Ollama daemon is not running, recommendation calls fail. Route must return a clear unavailable error envelope instead of throwing.
- **Model output reliability** → Local instruct models can drift from strict JSON. Keep response parsing hardening and fallback error envelope.
- **Over-compressed summaries may omit clinically important details** → Add resource-specific normalized fields plus optional top-N raw JSON snippets with provenance.
- **Prompt size growth from optional raw snippets** → Bound snippet count (`N`) and apply relevance ranking before inclusion.
- **Provider interface too thin if requirements grow** → If streaming or multi-turn support is needed, the interface will need a breaking change. Acceptable; keep it thin until the need is real.

## Open Questions

- Should we support optional hosted-provider fallback when local Ollama is unavailable, or stay local-only in v1?
- What is the agreed latency timeout budget per item on commodity developer hardware (currently assumed 10 s)?
- What confidence threshold, if any, should drive a distinct low-confidence visual state in the UI?
- Which local default model gives the best structure-quality/latency trade-off for questionnaire recommendations?
- What should the default top-N value be for optional raw JSON snippets (for example 0, 2, or 3)?
- What relevance heuristic should select top-N resources (item text match, code overlap, recency, or mixed scoring)?
