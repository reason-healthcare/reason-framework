## MODIFIED Requirements

### Requirement: One-click re-selection from recent list
The user SHALL be able to load a recent patient into the apply context with a single explicit selection action.

#### Scenario: Selecting a recent patient sets apply context
- **WHEN** the user activates a recent patient row selection control
- **THEN** that patient SHALL be set as the active patient context for the apply form and the entry's `addedAt` SHALL be updated to the current timestamp

#### Scenario: Recent selection hydrates selected patient preview
- **WHEN** a recent patient is selected
- **THEN** the selected patient preview card SHALL render with the selected patient's details and tabbed views

#### Scenario: Recent selection is keyboard accessible
- **WHEN** focus is on a recent patient selection control and the user presses Enter or Space
- **THEN** the selected recent patient SHALL be loaded into the active apply context