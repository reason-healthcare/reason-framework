## ADDED Requirements

### Requirement: Patient details tabs use property-based resource rendering
The selected patient preview card SHALL render loaded medication, condition, and observation resources by iterating non-META properties and formatting each property with `formatProperty`.

#### Scenario: Medications tab shows loaded medication data
- **WHEN** the `Medications` tab is active and medication data exists in loaded patient context
- **THEN** the UI SHALL display medication entries using property-based iteration with `formatProperty`
- **AND** the UI SHALL exclude META fields (`id`, `publisher`, `title`, `status`, `date`, `resourceType`, `text`, `meta`, `url`, `contact`, `name`, `version`, `content`, `mapping`, `snapshot`, `parameter`, `jurisdiction`, `count`)
- **AND** `meta.profile` SHALL remain excluded as part of excluded `meta`

#### Scenario: Conditions tab shows loaded condition data
- **WHEN** the `Conditions` tab is active and condition data exists in loaded patient context
- **THEN** the UI SHALL display condition entries using property-based iteration with `formatProperty`
- **AND** the UI SHALL exclude META fields (`id`, `publisher`, `title`, `status`, `date`, `resourceType`, `text`, `meta`, `url`, `contact`, `name`, `version`, `content`, `mapping`, `snapshot`, `parameter`, `jurisdiction`, `count`)
- **AND** `meta.profile` SHALL remain excluded as part of excluded `meta`

#### Scenario: Observations tab shows loaded observation data
- **WHEN** the `Observations` tab is active and observation data exists in loaded patient context
- **THEN** the UI SHALL display observation entries using property-based iteration with `formatProperty`
- **AND** the UI SHALL exclude META fields (`id`, `publisher`, `title`, `status`, `date`, `resourceType`, `text`, `meta`, `url`, `contact`, `name`, `version`, `content`, `mapping`, `snapshot`, `parameter`, `jurisdiction`, `count`)
- **AND** `meta.profile` SHALL remain excluded as part of excluded `meta`

#### Scenario: Observation properties include complex datatypes
- **WHEN** an observation has a `valueQuantity` with `value`, `unit`, and `system` fields
- **THEN** the formatted `valueQuantity` property SHALL display subfields using existing type-appropriate formatters
