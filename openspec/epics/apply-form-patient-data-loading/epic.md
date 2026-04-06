# Apply Form Patient Data Loading

- **Slug:** `apply-form-patient-data-loading`
- **Status:** complete
- **Priority:** high
- **Owner:** cpg-review

## Summary
Improve the `cpg-review` apply workflow by giving users two distinct patient loading modes — the existing manual input behavior and a new FHIR server patient browser — with previously selected patients persisted to a local-storage-backed recent patients tab for fast re-selection.

## Problem
The apply form today offers no structured way to browse and select a patient from a live FHIR server, forcing manual data preparation that is error-prone and slow. Users who frequently review the same patients also have no shortcut back to prior selections, adding repeated friction across sessions.

## Desired Outcomes
- The apply form offers both the existing manual input mode and a new FHIR server patient selection mode.
- Patients loaded via either mode (FHIR server selection or manual input) are persisted to a recent patients tab backed by localStorage.
- Users can re-select a recent patient with a single action, bypassing repeated server searches.
- Loaded patient context is confirmed and validated before apply execution.

## In Scope
- Two-mode patient loading UI: preserve existing manual/JSON input mode; add a new FHIR server patient search and selection mode.
- FHIR server patient search panel with configurable server URL, patient query, and result list. **Initial implementation targets unauthenticated servers only.**
- Recent patients tab that reads from and writes to localStorage, covering patients loaded via both modes; entries from FHIR server selections are scoped per server URL, entries from manual input are stored under a generic manual key.
- Apply-form state updates that reflect whichever patient context was loaded.
- Input validation and user-facing error states for both loading modes.

## Out of Scope
- Authenticated FHIR server access (deferred to `fhir-terminology-server-auth` epic).
- Server-side or database-backed patient history (localStorage only).
- Patient creation, editing, or deletion on the FHIR server.
- Major redesign of unrelated `cpg-review` pages.
- Long-term cross-device or cross-session patient record management.

## Candidate Changes
Use this table as the epic progress ledger. Update it when a change is proposed, implemented, or archived.

| Candidate Change | Summary | Why now | Readiness | Status | Linked Change | Notes |
|------------------|---------|---------|-----------|--------|---------------|-------|
| `design-patient-loading-modes` | Two-mode patient loading UX (manual + FHIR data endpoint searchable dropdown), mode switcher, recent patients tab, localStorage store, apply form integration, fhirClient abstraction, Jest setup | All three originally separate changes were implemented together as a single cohesive change | ready | archived | `openspec/changes/archive/2026-03-25-design-patient-loading-modes` | Absorbed `implement-fhir-server-patient-search`, `implement-recent-patients-tab`, and `integrate-patient-modes-apply-form`; all 38 tasks complete; 41 tests passing; delta specs synced to `openspec/specs/` |
| `refine-patient-context-panel` | Replace tab underline style with segmented button-group; add fixed-height scroll to recent patients list | First-pass UI gaps identified after v1 delivery | ready | archived | `openspec/changes/archive/2026-03-25-refine-patient-context-panel` | All 9 tasks complete; 42 tests passing; delta specs synced to `openspec/specs/` |
| `refine-patient-preview-and-recent-selection` | Add selected patient preview card with clear action and tabbed details; make recent entries explicitly selectable to set active context | Follow-up UX gaps from current patient context panel TODOs | ready | archived | `openspec/changes/archive/2026-03-26-refine-patient-preview-and-recent-selection` | Implemented 2026-03-26; archived after spec sync; tasks complete and cpg-review tests passing |

## Dependencies
- Existing apply form architecture in `packages/cpg-review`.
- An accessible unauthenticated FHIR server endpoint for development and testing.
- Any current patient payload schema constraints used by apply APIs.
- Browser localStorage available in deployment context.
- Future: `fhir-terminology-server-auth` epic — the HTTP fetch layer built here must be structured to accept auth header injection when that epic is implemented.

## Risks
- FHIR server CORS configuration may block in-browser patient queries; needs early spike.
- localStorage is not shared across browsers or devices; users on multiple machines will not see a unified recent list.
- Two-mode UI could confuse users if mode boundaries are not clearly designed and labeled.
- localStorage storage limits may require a max recents cap to avoid silent data loss.

## Open Questions
- What fields from the FHIR Patient resource should be displayed in the search results list (name, ID, DOB, MRN)?
- Should the FHIR server URL be user-configurable at runtime or fixed per deployment environment?
- What is the maximum number of recent patients to store per server in localStorage?
- Should clearing recent patients require explicit user action, or expire automatically?
- What is the minimum patient data required to run apply successfully?

## Notes
Preserving existing behavior as a mode ensures no regression for current users. The FHIR server mode and recent patients tab can ship together as a cohesive second mode without requiring the existing path to be reworked first. A CORS spike on the target FHIR server should be done early to validate the browser-side query approach.

**Auth migration path:** When `fhir-terminology-server-auth` is implemented, the FHIR fetch layer built in this epic should require no UI changes — only the injection of auth headers at the HTTP layer. To make this migration clean, the FHIR server fetch utility must be isolated behind a thin abstraction (e.g. a `fhirClient` module) rather than calling `fetch` directly at the component level. This is a design constraint that should be called out explicitly in `design-patient-loading-modes` and `implement-fhir-server-patient-search`.
