## Context

SelectedPatientPreviewCard currently displays patient resources (medications, conditions, observations) using custom label functions that extract specific fields (e.g., `medication.code`, `condition.code`, `observation.code` + `valueQuantity`). This approach is limited to hardcoded fields and requires maintaining custom formatting logic.

NarrativeDisplay.tsx has an established pattern for rendering complete FHIR resources:
- Iterates through all resource properties using `Object.entries(resource)`
- Uses shared `formatProperty` helper to render each field with type-appropriate formatting
- Filters out META fields (`id`, `resourceType`, `text`, `meta`, `publisher`, etc.)
- Passes `resolver` and `navigate` for navigation links

Current state: Patient card shows only selected fields. Users cannot see complete resource data without switching to Raw JSON tab.

## Goals / Non-Goals

**Goals:**
- Reuse NarrativeDisplay's formatProperty-based rendering pattern in patient preview card
- Show all FHIR resource properties (not just specific fields) in Medications, Conditions, Observations tabs
- Maintain consistent formatting across NarrativeDisplay and patient preview card
- Preserve navigation links to related resources
- Keep existing tab structure and layout

**Non-Goals:**
- Changing Overview tab (patient summary) - it's not resource-based
- Changing Raw JSON tab - it's already complete
- Modifying formatProperty helpers themselves
- Adding new formatting capabilities beyond what NarrativeDisplay already supports

## Decisions

### Decision 1: Reuse exact META filter from NarrativeDisplay

**Choice**: Copy the META constant array from NarrativeDisplay and use the same filtering logic (`!META.includes(key)`).

**Rationale**: 
- NarrativeDisplay's META list is well-tested and comprehensive
- Ensures consistency - same fields hidden in both views
- Avoids reinventing field filtering logic

**Alternatives considered**:
- Create patient-specific META filter → More work, inconsistent with narrative display
- Show all fields including id/resourceType → Too noisy for preview card

### Decision 2: Use formatProperty for each resource entry

**Choice**: Replace custom label functions (medicationLabel, conditionLabel, observationLabel) with property-iteration rendering:
```tsx
Object.entries(resource)
  .map(([key, value]) => {
    if (!META.includes(key)) {
      return formatProperty(value, resolver, navigate, key)
    }
  })
  .filter(notEmpty)
```

**Rationale**:
- Matches NarrativeDisplay property iteration while excluding metadata noise in patient preview
- formatProperty already handles all FHIR datatypes (CodeableConcept, Quantity, Reference, etc.)
- Enables navigation to referenced resources
- Shows complete resource data, not just curated fields

**Alternatives considered**:
- Keep label-based approach, extend with more fields → Still incomplete, more maintenance
- Create custom property renderer for patient card → Duplicates formatProperty logic

### Decision 2b: Exclude `meta.profile` in patient details view

**Choice**: Do not special-case `meta.profile`; keep it excluded along with `meta`.

**Rationale**:
- Patient details view should emphasize clinical data over technical metadata
- `meta.profile` remains available in Raw JSON when needed
- Keeps the preview readable and consistent with other META exclusions

### Decision 3: Pass resolver and navigate to enable navigation

**Choice**: Pass `resolver` and `navigate` props to formatProperty calls in patient card.

**Rationale**:
- Patient card already has access to both via router context
- Users benefit from clicking through to related resources (e.g., Medication references MedicationKnowledge)
- Consistent with NarrativeDisplay behavior

**Alternatives considered**:
- Pass undefined for navigate (no links) → Inconsistent, reduces utility

### Decision 4: Render properties as list items within existing List component

**Choice**: Render formatted properties using Ant Design `<List.Item>` components within existing tab lists.

**Rationale**:
- Patient card already uses `<List>` for each tab's resource entries
- Each resource becomes a list item, properties render within item description
- Maintains existing visual structure while expanding content

**Alternatives considered**:
- Replace List with div-based layout → Breaks existing styling
- Flatten properties into single text block → Loses formatProperty's rich rendering

## Risks / Trade-offs

**[Risk]** Verbose output - showing all properties may overwhelm preview card
→ **Mitigation**: META filter removes common noise fields; users can collapse to Raw JSON tab if needed

**[Risk]** Breaking changes for users expecting simple labels
→ **Mitigation**: More information is generally better for clinical context; comprehensive data reduces need to click through to full resource view

**[Risk]** Test brittleness - property-based rendering is more complex than label assertions
→ **Mitigation**: Tests should verify presence of key properties rather than exact output; use `.toHaveTextContent()` for flexible matching

**[Trade-off]** Performance - iterating all properties vs. extracting specific fields
→ Acceptable: Patient card shows limited resources (< 20 per tab typically); formatProperty is fast

**[Trade-off]** Screen space - more content per resource entry
→ Acceptable: Users benefit from complete context; tabs keep content organized
