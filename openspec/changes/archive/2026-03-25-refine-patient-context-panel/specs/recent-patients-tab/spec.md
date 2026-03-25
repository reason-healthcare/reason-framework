## ADDED Requirements

### Requirement: Recent patients list is scrollable within a fixed-height container
The recent patients list SHALL be rendered inside a fixed-height scrollable container so that the patient context panel height remains predictable regardless of how many entries exist.

#### Scenario: Container scrolls when entries exceed visible area
- **WHEN** the recent patients list contains enough entries to exceed the container height
- **THEN** the container SHALL scroll vertically and patient entries outside the visible area SHALL be reachable by scrolling

#### Scenario: Container height does not grow beyond maximum
- **WHEN** the recent patients list is rendered with any number of entries
- **THEN** the panel height SHALL NOT exceed the fixed container maximum, and the rest of the apply form layout SHALL remain stable
