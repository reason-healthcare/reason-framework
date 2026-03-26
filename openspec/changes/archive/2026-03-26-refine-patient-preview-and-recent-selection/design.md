## Context

The apply form already supports manual and endpoint patient loading plus a recent patients list, but there is no consolidated selected-patient presentation area with direct clear controls. The TODO scope adds a focused patient preview surface and makes recent items directly selectable to drive active context.

## Goals / Non-Goals

**Goals:**
- Present active patient context in a dedicated preview card.
- Provide tabbed views for overview, medications, conditions, and raw JSON.
- Allow users to clear selected patient state in one action.
- Ensure recent patient rows are interactive selectors that update active context and preview state.

**Non-Goals:**
- Changing backend APIs or FHIR fetch behavior.
- Introducing new persistence models beyond existing local/session storage usage.
- Redesigning unrelated apply-form sections.

## Decisions

- Introduce a dedicated selected-patient preview component colocated with patient context mode controls to keep context visibility persistent.
- Drive preview tabs from existing loaded patient payload data; map missing sections to explicit empty states rather than additional fetches.
- Keep clear action local to patient context state reset (subject/patient summary) without clearing endpoint configuration or recent history.
- Wire recent-patient row click/select affordance to the same context-setting pathway used by manual/endpoint selection to avoid divergent state behavior.

## Risks / Trade-offs

- [Incomplete patient payload sections] → Provide deterministic empty states for medications/conditions when data is absent.
- [Large raw JSON rendering] → Use fixed-height scroll region for raw JSON tab to avoid panel growth.
- [Interaction ambiguity in recent list] → Add explicit button/row affordance and matching tests for click + keyboard activation.

## Migration Plan

- Add preview component and integrate into patient context panel.
- Update recent-patients list interactions to invoke existing selection handler.
- Add/adjust tests for preview rendering, clear action, and recent selection behavior.
- Rollback path: remove preview integration and restore prior list rendering while retaining storage format.

## Open Questions

- Should clearing selected patient also reset active tab to `Manual`, or only clear patient context while leaving mode unchanged?
- For medications and conditions tabs, should ordering be newest-first when date fields are available?