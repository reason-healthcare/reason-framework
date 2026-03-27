## Context

The selected patient preview currently renders tabbed sections for core summary plus related clinical resources. In endpoint-driven selection, the context can legitimately include only the Patient resource unless additional fetches are performed. Without source-aware messaging, an empty list can be interpreted as "patient has none" rather than "data not loaded."

## Goals / Non-Goals

**Goals:**
- Make `Medications`, `Conditions`, and `Observations` empty states deterministic and source-aware.
- Clearly indicate when endpoint-selected contexts do not include fetched related resources.
- Preserve existing rendering when related resources are present.
- Keep `Raw JSON` behavior unchanged (raw payload only).

**Non-Goals:**
- Fetching additional FHIR resources automatically from the endpoint.
- Expanding this change to broader endpoint workflow redesign.
- Introducing new persistence or backend schema changes.

## Decisions

- Determine context source from existing selected-patient metadata (`manual` vs `endpoint`) and use it when building tab empty-state copy.
  - Alternative considered: infer source solely from payload shape. Rejected because payload shape is not a reliable source-of-truth across flows.
- Use explicit empty-state text for endpoint-selected contexts when no resources for a tab are available, indicating data was not loaded from endpoint selection.
  - Alternative considered: keep generic "No X available" messaging. Rejected because it hides whether data is absent vs not fetched.
- Keep list rendering and status-pill behavior unchanged when resources are present.
  - Alternative considered: disable tabs when endpoint resources are absent. Rejected to preserve consistent navigation and avoid implying feature unavailability.

## Risks / Trade-offs

- [Copy ambiguity across tabs] → Reuse a consistent endpoint-empty-state pattern and verify in component tests.
- [Future auto-fetch integration could change semantics] → Scope wording to current behavior ("not loaded in this selection") rather than permanent absence.
- [Source metadata may be missing in some fallback flows] → Define fallback behavior to existing generic empty states when source cannot be determined.