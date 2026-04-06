## Why

The patient preview card currently displays only specific resource fields (medication code, condition code, observation code/value) with custom label formatting. NarrativeDisplay.tsx already has a comprehensive `formatProperty`-based approach that handles all FHIR resource properties with consistent formatting and navigation links. We should reuse this established pattern for the patient preview card to provide complete resource visibility and maintain formatting consistency across the application.

## What Changes

- Apply `formatProperty`-based rendering to patient preview card resource displays
- Show all resource properties (not just hardcoded fields) using the same iteration and formatting logic as NarrativeDisplay
- Maintain the META field filtering approach (skip `id`, `resourceType`, `text`, `meta`, etc.)
- Exclude `meta.profile` from patient details view by treating it as part of excluded `meta`
- Preserve existing tab structure (Overview, Medications, Conditions, Observations, Raw JSON)

## Capabilities

### New Capabilities
<!-- None - reusing existing formatProperty infrastructure -->

### Modified Capabilities
- `selected-patient-preview`: Change resource display from specific-field labels to comprehensive property-based rendering using formatProperty

## Impact

- SelectedPatientPreviewCard component: rendering logic for resource items
- Card tests: assertions will need updating for new property-based output
- Users will see more complete resource information in patient preview tabs
