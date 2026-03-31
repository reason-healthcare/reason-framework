## Context

`QuestionnaireRenderer` renders `BaseRenderer` from `@aehrc/smart-forms-renderer`. This is a third-party component we do not control; we cannot inject custom UI into individual questionnaire items. Recommendation display must therefore live *outside* the renderer, placed below it in the component tree.

The `questionnaire` and `questionnaireResponseServer` FHIR resources are already available as props on `QuestionnaireRenderer` — they carry the item definitions and pre-populated answers needed to build recommendation requests.

## Goals / Non-Goals

**Goals:**
- A `RecommendationPanel` component rendered below `BaseRenderer` in `QuestionnaireRenderer`.
- The panel fetches `/api/recommend` for each visible questionnaire item when the questionnaire loads and displays results as they arrive.
- Four visual states per item: loading, success, low-confidence (confidence < 0.5), error/unavailable.
- Uses Ant Design components (`Card`, `Tag`, `Spin`, `Alert`) to match the existing app style.

**Non-Goals:**
- Accept/reject interactions (deferred to a future change).
- Injecting recommendation UI inline within the Smart Forms renderer.
- Re-fetching recommendations on every form field change.
- Batching multiple items into a single API call (single-item calls are fine for v1).

## Decisions

### 1. Display below `BaseRenderer`, not inline

**Decision:** `RecommendationPanel` is a sibling element below `BaseRenderer`, not a wrapper around it.

**Rationale:** We have no API into `BaseRenderer`'s per-item rendering. Attempting to overlay or inject inside it would require DOM manipulation that would break on renderer updates. Below-renderer placement is stable and decoupled.

---

### 2. Fire all item recommendation requests concurrently on mount

**Decision:** On mount, `RecommendationPanel` calls `Promise.all` (or equivalent concurrent fetches) across all top-level, non-hidden questionnaire items.

**Rationale:** Concurrent fetching minimises total wait time. Individual items show their own loading state so users see results progressively. Sequential fetching would be unnecessarily slow.

**Alternative considered:** Lazy-fetch on scroll/focus. Rejected — added complexity with minimal benefit given typical questionnaire item counts.

---

### 3. Low-confidence threshold at 0.5

**Decision:** Items with `confidence < 0.5` receive a distinct warning visual treatment (Ant Design `Tag` with `color="warning"`) to signal reduced reliability.

**Rationale:** 0.5 is the midpoint of the 0–1 scale and is the most intuitive threshold for a v1 implementation. The threshold is a constant that can be adjusted without architectural change.

---

### 4. Error state is silent/muted, not alarming

**Decision:** If `/api/recommend` returns an error for an item, the panel shows a muted "Recommendation unavailable" message for that item rather than a prominent error alert.

**Rationale:** Recommendations are supplementary. An LLM failure should not disrupt the questionnaire workflow or create alarm. Users can still answer questions manually.

---

### 5. Ant Design components, no new styling dependencies

**Decision:** Use `Card`, `Tag`, `Spin`, `Typography`, and `Alert` from the existing `antd` dependency.

**Rationale:** No new dependencies needed; UI will be visually consistent with the rest of the app.

---

## Risks / Trade-offs

- **Many concurrent API calls** → For questionnaires with many items, N concurrent Gemini calls may hit rate limits or degrade UX. Mitigation: acceptable for v1 given typical CPG questionnaire size (usually <20 items); add batching or limiting if needed in a follow-up.
- **Stale recommendations after form edit** → Recommendations are fetched once on mount; if the user edits answers, recommendations may no longer align with state. Mitigation: in v1 this is acceptable (recommendations are informational); add refresh-on-change in a later iteration.
- **Confidence score accuracy** → Model self-reported confidence is unreliable as a precise signal. Mitigation: documented limitation; confidence is for rough triage only.

## Open Questions

- Should the panel be collapsed/expandable by default, or always visible?
- Should items with `hidden: true` in the questionnaire be excluded from recommendation requests?
