## Why

When a patient is selected from a FHIR data endpoint, the Raw JSON tab of the selected patient preview card currently shows the wrapper collection bundle (e.g. `{ resourceType: "Bundle", type: "collection", entry: [...] }`) rather than the actual Patient resource returned by the server. This obscures the true source payload and is inconsistent with what "raw FHIR JSON from the source" means for an endpoint-sourced patient.

## What Changes

- Store the raw Patient FHIR resource JSON in `EndpointPatientSummary.json` (previously stored the collection bundle)
- The collection bundle is still constructed and passed as `dataPayload` to `onPatientSelect` for CPG execution (no change to execution behavior)
- `SelectedPatientPreviewCard` uses `selectedPatient.json` (the Patient resource) for the Raw JSON display when source is `'endpoint'`, instead of rendering `dataPayload`

## Capabilities

### New Capabilities

### Modified Capabilities
- `fhir-patient-search-panel`: the `json` field stored in the patient summary SHALL now contain the raw Patient resource JSON, not the collection bundle
- `selected-patient-preview`: the Raw JSON tab SHALL display `selectedPatient.json` (the Patient resource) for endpoint patients, and the existing `dataPayload`-derived payload for all other sources

## Impact

- `components/apply-form/FhirPatientSearchPanel.tsx` — `json` on the summary set to `JSON.stringify(patientResource)` instead of the collection bundle
- `components/apply-form/SelectedPatientPreviewCard.tsx` — Raw JSON display branched by source: endpoint uses `selectedPatient.json`, others use `parseRawJson(dataPayload)`
- `tests/components/FhirPatientSearchPanel.test.tsx` — assertion on stored `json` field updated
- `tests/components/SelectedPatientPreviewCard.test.tsx` — test for Raw JSON tab updated
