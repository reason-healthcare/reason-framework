# Epic Index

Use this folder to capture product and platform work before it becomes an implementation change.

## Workflow
1. Capture rough ideas with the epic-planning skill.
2. Normalize them into epics under this folder.
3. Pick one epic.
4. Run `propose` from a candidate change inside that epic.

## Expected Structure
- One folder per epic: `openspec/epics/<epic-name>/`
- Source of truth: `openspec/epics/<epic-name>/epic.md`
- Template: `openspec/epics/epic-template.md`

## Active Epics

| Epic | Priority | Status | Notes |
|------|----------|--------|-------|
| `apply-form-patient-data-loading` | high | complete | `design-patient-loading-modes`, `refine-patient-context-panel`, and `refine-patient-preview-and-recent-selection` archived |
| `questionnaire-agent-recommendations` | high | proposed | Add item-level recommended answers with rationale and user accept/reject |
| `fhir-endpoint-config-panel` | high | complete | `implement-fhir-config-panel-ui` archived |
| `fhir-terminology-server-auth` | medium | deferred | Authentication config for FHIR and terminology servers; deferred until after patient loading UX ships |
