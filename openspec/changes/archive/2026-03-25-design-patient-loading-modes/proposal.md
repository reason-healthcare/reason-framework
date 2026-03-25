## Why

The `cpg-review` apply form has no structured way to browse and select a patient from the FHIR server already configured as the `dataEndpoint` in the apply operation. The `dataEndpoint` parameter (a FHIR `Endpoint` resource per the CPG `$apply` spec) is currently used only to gather supplemental data for a manually-entered patient — it is never used to let the user discover or select a patient. Users who repeatedly review the same patients also have no shortcut back to prior selections, adding friction on every session.

## What Changes

- The apply form gains a **mode switcher** allowing users to choose between the existing manual/JSON patient input and a new FHIR server patient search mode.
- A **FHIR data endpoint patient search panel** is added: when a `dataEndpoint` is configured in the apply form, users can search patients on that endpoint by name and select one to populate the `subject` parameter. Each patient row displays full name (`Patient.name` — `HumanName`, rendered as `given + family`), date of birth (`Patient.birthDate`), and administrative gender (`Patient.gender`). No new server URL field is introduced — the panel reuses the existing `dataEndpoint`. Scoped to unauthenticated endpoints in v1.
- A **recent patients tab** is added: patients loaded via either mode are persisted to localStorage and available for one-click re-selection. FHIR-sourced entries are scoped per server URL; manually added entries use a generic key.
- All three surfaces define their empty, loading, error, and populated states explicitly.
- The FHIR HTTP fetch layer is abstracted behind a `fhirClient` module to allow auth header injection in a future change without modifying UI components.

## Capabilities

### New Capabilities
- `patient-load-mode-switcher`: Mode switcher UI between manual input and FHIR server selection; layout, states, and transition behavior.
- `fhir-patient-search-panel`: Patient search panel using the existing apply form `dataEndpoint`; query input, result list displaying full name (`Patient.name`: given + family), date of birth (`Patient.birthDate`), and gender (`Patient.gender`) per FHIR R4; selected patient populates the apply form `subject` parameter. Unauthenticated only in v1.
- `recent-patients-tab`: Recent patients tab backed by localStorage; scoped storage keys, max recents limit, display of full name, DOB, and gender per entry, and clear behavior.

### Modified Capabilities

## Impact

- `packages/cpg-review`: Apply form component(s) gain mode switcher and new panel surfaces.
- New `fhirClient` abstraction module introduced for all FHIR HTTP requests from the browser.
- localStorage schema extended with new keys for recent patients (scoped per server URL and a manual key).
- No backend changes; no authenticated server support in v1.
