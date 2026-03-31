# Questionnaire Agent Recommendations

- **Slug:** `questionnaire-agent-recommendations`
- **Status:** proposed
- **Priority:** high
- **Owner:** cpg-review

## Summary
Enable an agent-assisted questionnaire experience where each item receives an LLM-generated recommended answer with rationale, and users explicitly accept or reject each recommendation. This epic covers the full stack: LLM integration architecture, the agent recommendation service contract, and the cpg-review UI.

## Problem
Users answering complex questionnaire items often lack decision support at the point of entry, leading to slower completion and inconsistent answers. There is currently no architectural foundation for invoking an LLM against questionnaire context, no defined service contract for delivering recommendations to the UI, and no interaction model for capturing user responses to those recommendations.

## Desired Outcomes
- A defined architecture for invoking an LLM with questionnaire item context and patient data, returning a structured recommendation and rationale.
- Each questionnaire item can display an LLM-generated recommended answer and rationale.
- Each recommendation includes a confidence score for UI display and triage.
- The LLM integration is abstracted behind a provider interface so the underlying model can be swapped without UI changes.

## In Scope
- Architecture design for LLM integration: provider abstraction layer, prompt construction strategy, input/output schema, and error handling.
- Agent recommendation service contract: request shape (questionnaire item + patient context) and response shape (recommended answer + rationale + confidence).
- UI patterns for showing recommendations and rationale below the Smart Forms renderer in v1.
- Initial provider implementation using a local model runtime (Ollama) behind a pluggable provider interface.
- Package-boundary decision and architecture: recommendation service in `cpg-review` vs a standalone shared package.

## Out of Scope
- LLM fine-tuning or training on clinical data.
- Fully autonomous questionnaire completion without user confirmation.
- Multi-turn LLM conversation or chat interfaces.
- Broad redesign of questionnaire navigation outside recommendation interactions.
- Historical analytics dashboards for recommendation quality or LLM accuracy.
- Accept/reject interactions and decision persistence (deferred to a future change).

## Candidate Changes
Use this table as the epic progress ledger. Update it when a change is proposed, implemented, or archived.

| Candidate Change | Summary | Why now | Readiness | Status | Linked Change | Notes |
|------------------|---------|---------|-----------|--------|---------------| ------|
| `design-llm-integration-architecture` | Define the LLM provider abstraction, local-model-first implementation strategy, request/response schema (including confidence), and error-handling contract for questionnaire recommendations | Must be resolved first; all downstream changes depend on this contract | ready | archived | `openspec/changes/archive/2026-03-31-design-llm-integration-architecture` | Cover provider swap strategy, package boundary (`cpg-review` vs standalone package), token limits, latency expectations, and PII handling in prompts |
| `design-questionnaire-recommendation-ui` | Define recommendation/rationale/confidence display below Smart Forms renderer for v1 | Needed to establish trust and avoid confusing interaction patterns while minimizing renderer coupling | ready | archived | `openspec/changes/archive/2026-03-31-design-questionnaire-recommendation-ui` | Include edge states (no recommendation, low confidence, LLM error) |
| `implement-llm-recommendation-service` | Implement the LLM integration layer: provider abstraction, prompt builder, and structured response parser | Delivers the backend capability the UI depends on | needs-design | not-started | `openspec/changes/implement-llm-recommendation-service` | Depends on architecture design; initial target provider TBD in open questions |
| `implement-questionnaire-recommendation-engine-integration` | Integrate recommendation service responses into the questionnaire rendering pipeline with v1 display below Smart Forms renderer | Delivers core capability users requested | needs-design | not-started | `openspec/changes/implement-questionnaire-recommendation-engine-integration` | Requires service contract from LLM implementation change |
| `implement-accept-reject-recommendation-flow` | Persist and apply per-item user accept/reject decisions in the form experience | Explicit user decisioning is planned as a future enhancement after recommendation visibility baseline ships | not-ready | future | `openspec/changes/implement-accept-reject-recommendation-flow` | Deferred: out of scope for this epic iteration |

## Dependencies
- LLM provider API access (key management, rate limits, cost controls).
- Patient context available at the point of questionnaire item rendering.
- Agent recommendation service contract (defined in architecture change).
- Questionnaire form state management in `packages/cpg-review`.

## Risks
- LLM responses may include hallucinated or clinically inappropriate recommendations; rationale display and user confirmation are the primary mitigation.
- LLM API latency may degrade questionnaire responsiveness; streaming or pre-fetch strategies may be needed.
- PII in questionnaire context passed to an external LLM provider requires privacy review before deployment.
- Poor rationale quality could reduce user trust in recommendations.
- Ambiguous accept/reject semantics may conflict with manual answer edits.

## Open Questions
- Should the recommendation service live in `packages/cpg-review` initially, or in a new standalone package (e.g., `packages/questionnaire-recommendation-service`) from day one?
- What is the acceptable latency budget for a recommendation response before the UI shows a timeout state?
- Can patient data be sent to an external LLM provider, or does PII handling require a self-hosted model?
- Should prompt templates be configurable per questionnaire or fixed at the system level?
- Should low-confidence recommendations use a separate visual treatment threshold in the v1 UI?

## Notes
The LLM integration architecture change is the critical path blocker for all implementation work. Prioritize it alongside UI design so both tracks can inform each other early. The provider abstraction layer is essential — it insulates the rest of the system from vendor lock-in and enables local/self-hosted model usage if PII constraints require it. Current direction: local-model first (Ollama), with a pluggable provider contract. For v1, prioritize recommendation visibility (recommended answer + rationale + confidence) below the Smart Forms renderer before introducing accept/reject decision workflows.
