## Context

The `cpg-review` apply form currently accepts patient data only via manual JSON input. The apply operation already accepts a `dataEndpoint` parameter (a FHIR `Endpoint` resource per the CPG `$apply` spec) which is used to retrieve supplemental patient data during evaluation. However, this endpoint is never surfaced to let users discover or select a patient — users must still manually supply the `subject` reference.

This change introduces a mode switcher so users can choose between the existing manual path and a new patient browser that queries the existing `dataEndpoint` to search and select a patient, populating the `subject` parameter directly. Recently used patients are persisted to localStorage for fast re-selection.

## Goals / Non-Goals

**Goals:**
- Define the component structure for the mode switcher, FHIR data endpoint patient search panel, and recent patients tab.
- Establish the `fhirClient` abstraction so auth can be injected later with no UI changes.
- Define the localStorage schema for recent patients covering both data-endpoint-sourced and manually-added entries.
- Define all UI states: empty, loading, error, populated for each surface.
- Clarify how patient selection populates the `subject` parameter and how the `dataEndpoint` relationship is preserved.

**Non-Goals:**
- Implementing authenticated FHIR queries (deferred).
- Changing the apply form submission flow beyond receiving patient context.
- Persisting data server-side.

## Decisions

### 1. Mode switcher as a tab or toggle within the apply form
**Decision:** Tab-based mode switcher with two tabs: "Manual" and "FHIR Server".  
**Rationale:** Tabs cleanly separate the two input surfaces, preserve existing manual mode without visual demotion, and make the current mode unambiguous.  
**Alternative considered:** A toggle/radio above a single panel. Rejected — the two modes have sufficiently different panel structures that sharing a single panel area adds conditional rendering complexity without UX benefit.

### 2. fhirClient abstraction layer
**Decision:** All browser-to-FHIR-endpoint HTTP calls go through a `fhirClient(endpointUrl, options)` utility module. Components never call `fetch` directly for FHIR queries. The `endpointUrl` is derived from the `dataEndpoint.address` field of the FHIR `Endpoint` resource already present in the apply form.
**Rationale:** When the auth epic is implemented, auth headers are injected in exactly one place (`fhirClient`). No component changes needed.
**Alternative considered:** Pass auth headers as props at call sites. Rejected — scatters auth logic across components and guarantees rework.

### 3. localStorage schema for recent patients
**Decision:**
- Data-endpoint-sourced entries: key `cpg-review:recent-patients:endpoint:<endpointUrl>`, value: JSON array of patient summary objects (max 10 entries, LRU eviction). `endpointUrl` is derived from `dataEndpoint.address`.
- Manual entries: key `cpg-review:recent-patients:manual`, value: JSON array of patient summary objects (max 10 entries, LRU eviction).
- Patient summary shape: `{ id, name, dob, gender, source: 'endpoint' | 'manual', endpointUrl?: string, addedAt: ISO8601 }`.
**Rationale:** Scoping endpoint entries per `dataEndpoint.address` prevents cross-endpoint patient ID collisions. A shared max of 10 per key keeps localStorage usage bounded with a predictable eviction strategy.
**Alternative considered:** A single unified key for all recent patients. Rejected — FHIR patient IDs are server-relative; merging entries from multiple endpoints without scoping creates identity ambiguity.
**Decision:** Use FHIR `GET /Patient?name=<query>` against `dataEndpoint.address` as the primary search. Display name, DOB, gender, and patient ID in result rows. The selected patient's FHIR ID is used to populate the apply form `subject` parameter as `Patient/<id>`.
**Rationale:** `name` search is supported by all major FHIR R4 servers. Reusing the existing `dataEndpoint` avoids introducing a new server configuration field.
**Alternative considered:** Introducing a separate patient browser server URL field. Rejected — redundant with `dataEndpoint`, which already represents the patient data source for the apply operation.

## Risks / Trade-offs

- **CORS on dataEndpoint** → The FHIR endpoint referenced by `dataEndpoint.address` must have CORS headers that allow the app origin. Early spike recommended against the target dev endpoint before building the full panel. Mitigation: document the required CORS config and provide a clear error state in the UI when requests are blocked.
- **localStorage tab scoping** → The recent patients list uses localStorage (shared across tabs of the same origin). This is intentional for convenience but means two tabs can race to update the same list. Mitigation: use a simple read-modify-write with timestamp ordering; acceptable for a non-critical recents list.
- **Max recents cap** → 10 entries per key is an opinionated default. Mitigation: make the cap a named constant so it can be adjusted later without a design change.

## Open Questions

- Should the patient browser panel be hidden or disabled when no `dataEndpoint` is present in the apply form, or should it prompt the user to configure one? Current assumption: the "FHIR Data Endpoint" tab is disabled with an explanatory tooltip when `dataEndpoint` is absent.
- Should the recent patients tab show a mixed list from both modes or separate sections per source? Current assumption: mixed list, sorted by `addedAt` descending, with a source badge per entry.
