## ADDED Requirements

### Requirement: Mode switcher uses segmented button-group visual style
The patient context mode switcher SHALL be rendered as a segmented button group — a row of bordered pill buttons with the active segment filled and elevated — rather than an underline tab style. No ink-bar or bottom border SHALL be present.

#### Scenario: Active segment is visually distinct
- **WHEN** a mode segment is active
- **THEN** it SHALL render with a solid background fill and elevated appearance, and no underline or ink-bar SHALL be visible

#### Scenario: Inactive segments are bordered and unfilled
- **WHEN** a mode segment is inactive
- **THEN** it SHALL render as a bordered pill button without background fill

#### Scenario: Disabled segment is visually muted
- **WHEN** the "FHIR Data Endpoint" segment is disabled (no dataEndpoint configured)
- **THEN** it SHALL render with reduced opacity and a not-allowed cursor, consistent with the segmented button-group disabled state
