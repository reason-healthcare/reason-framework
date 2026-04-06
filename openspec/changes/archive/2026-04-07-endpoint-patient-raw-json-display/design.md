## Context

`SelectedPatientPreviewCard` renders a Raw JSON tab whose content comes from `parseRawJson(dataPayload)`, where `dataPayload` is the execution input passed down from `ApplyForm`. For endpoint patients, `FhirPatientSearchPanel` currently constructs a synthetic `collection` Bundle containing the Patient resource and passes it as both the stored `json` field and the `dataPayload` to `onPatientSelect`. The Raw JSON tab therefore shows the synthetic wrapper bundle — not the `Patient` resource that was actually returned by the FHIR server.

This is also functionally incorrect. Endpoint mode `$apply` is designed around a _data endpoint URL_ — the CPG engine fetches patient data from the endpoint at execution time. Sending a `dataPayload` bundle alongside the endpoint URL is not only unnecessary but inconsistent with how `PatientSelectionPanel` handles endpoint patient re-selection (which correctly passes `undefined` as `dataPayload`). The collection bundle construction in `handleChange` should not exist.

The previous `refactor-patient-summary-types` change introduced `EndpointPatientSummary.json` specifically to carry "the FHIR payload for this patient". The intent for that field was to store the Patient resource itself; the current value (collection bundle) was a placeholder.

## Goals / Non-Goals

**Goals:**
- `EndpointPatientSummary.json` stores the raw `Patient` resource JSON as returned by the server
- Raw JSON tab shows the `Patient` resource JSON for endpoint patients
- Endpoint-mode `$apply` sends no `dataPayload` — the CPG engine uses `dataEndpointPayload` alone (consistent with `PatientSelectionPanel` re-selection behavior)
- No other tabs or behaviors are affected

**Non-Goals:**
- Changing how package patients display Raw JSON (still shows the full Bundle)
- Fetching any additional data from the endpoint beyond what the search already returns
- Caching or re-fetching the Patient resource after initial selection

## Decisions

### 1. Remove collection bundle construction from `handleChange`; store raw Patient resource in `json`

The two `$apply` modes have distinct contracts:
- **Endpoint mode**: `dataPayload = undefined`, `dataEndpointPayload = <url>` — the CPG engine fetches data from the endpoint
- **Package mode**: `dataPayload = <bundle>`, `dataEndpointPayload = (optional url)`

`FhirPatientSearchPanel.handleChange` should reflect endpoint mode correctly:
- `summary.json = JSON.stringify(patientResource)` — the raw Patient resource for storage and display
- `onPatientSelect(..., undefined)` — no `dataPayload` for endpoint patients
- The `bundle` / `bundleJson` variables are removed entirely

This aligns first-time selection with `PatientSelectionPanel`'s re-selection path, which already passes `undefined` as `dataPayload` for endpoint patients.

### 2. Raw JSON display uses `selectedPatient.json` with `dataPayload` fallback

```ts
const rawFhirPayload = parseRawJson(selectedPatient?.json || dataPayload)
```

`selectedPatient.json` is the canonical payload for the selected patient across both sources:
- **Endpoint patient**: the raw `Patient` resource JSON (set by this change)
- **Package patient**: the full `Bundle` JSON stored at selection time

The `|| dataPayload` fallback handles the one edge case where `selectedPatient.json` may be falsy: a package patient re-selected from the resolver fallback path in `PatientSelectionPanel`, where `summary.json` was empty and `effectiveBundleJson` came from `resolver.resourcesByReference[...]`. In that case `dataPayload` carries the bundle. This makes the expression source-agnostic — no branching on `source` is needed.

**Alternatives considered:**
- Branch on `source === 'endpoint'` for endpoint patients, fall back to `dataPayload` for others — requires source awareness in the display layer and misses the resolver-fallback edge case for package patients. Rejected in favour of the unified `|| dataPayload` expression.
- Extract the Patient resource from `dataPayload` at display time — couples display logic to bundle structure. Rejected; `selectedPatient.json` is the right storage location.

## Risks / Trade-offs

- **Existing stored endpoint entries have `json` = collection bundle** → After deploy, any endpoint patients in recent-patients localStorage will show the collection bundle instead of the Patient resource in Raw JSON, until they re-select. Mitigation: acceptable; recents are short-lived, and the change is display-only.
- **`$apply` validation in `ApplyForm.isValidForm`** → The validator requires either `dataPayload` or `dataEndpointPayload`. Endpoint patients now send `dataPayload = undefined`, so `dataEndpointPayload` must be set — which it always is when a FHIR endpoint is configured. No validation change is needed; the existing logic handles this correctly.
- **`selectedPatient` may be `undefined`** → The branch falls back to `parseRawJson(dataPayload)` gracefully, same as before.
