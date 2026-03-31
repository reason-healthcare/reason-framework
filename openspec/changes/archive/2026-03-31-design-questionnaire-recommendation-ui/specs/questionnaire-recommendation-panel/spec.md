## ADDED Requirements

### Requirement: RecommendationPanel displays below the Smart Forms renderer
The system SHALL render a `RecommendationPanel` component directly below `BaseRenderer` inside `QuestionnaireRenderer`.

The panel SHALL be visible whenever a `questionnaire` and `questionnaireResponseServer` are available (i.e., the same condition under which `BaseRenderer` is shown).

#### Scenario: Panel appears when questionnaire is loaded
- **WHEN** a questionnaire and questionnaire response are available in `QuestionnaireRenderer`
- **THEN** `RecommendationPanel` is rendered below the Smart Forms renderer

#### Scenario: Panel is not rendered when questionnaire is absent
- **WHEN** either `questionnaire` or `questionnaireResponseServer` is undefined
- **THEN** `RecommendationPanel` is not rendered

### Requirement: Panel fetches recommendations for all visible questionnaire items on mount
The system SHALL call `POST /api/recommend` for each non-hidden top-level item in the questionnaire when `RecommendationPanel` mounts. Requests SHALL be fired concurrently.

Each item SHALL independently track its own fetch state (loading, success, error).

#### Scenario: Recommendations fetched concurrently on mount
- **WHEN** `RecommendationPanel` mounts with a questionnaire containing multiple items
- **THEN** a recommendation request is initiated for each non-hidden item concurrently, without waiting for one to complete before the next starts

#### Scenario: Items with type `display` or `group` are excluded
- **WHEN** a questionnaire item has `type: "display"` or `type: "group"`
- **THEN** no recommendation request is made for that item

### Requirement: Panel shows loading state per item while fetching
Each questionnaire item slot in the panel SHALL display a loading indicator while its recommendation is being fetched.

#### Scenario: Loading indicator shown during fetch
- **WHEN** a recommendation request for an item is in-flight
- **THEN** that item's slot in the panel shows a spinner or skeleton loading state

### Requirement: Panel shows recommendation on success
When `/api/recommend` returns a result without an `error` field, the panel SHALL display:
- The item's `text` label as a heading
- The `recommendedAnswer`
- The `rationale`
- The `confidence` score as a percentage or labelled badge

#### Scenario: Successful recommendation displayed
- **WHEN** `/api/recommend` returns `{ recommendedAnswer, rationale, confidence }` with no `error`
- **THEN** all three values are displayed for the corresponding item in the panel

### Requirement: Panel applies low-confidence visual treatment
Items with `confidence < 0.5` SHALL use a distinct warning visual treatment to signal reduced reliability (e.g., Ant Design `Tag` with `color="warning"` or equivalent).

#### Scenario: Low confidence item receives warning treatment
- **WHEN** a returned recommendation has `confidence < 0.5`
- **THEN** the confidence indicator uses a warning colour rather than the default style

#### Scenario: High confidence item receives standard treatment
- **WHEN** a returned recommendation has `confidence >= 0.5`
- **THEN** the confidence indicator uses the standard (non-warning) colour

### Requirement: Panel shows muted unavailable message on error
When `/api/recommend` returns a response with an `error` field, or the fetch itself fails, the panel SHALL display a muted "Recommendation unavailable" message for that item. The message SHALL NOT use an alarming or error-prominent style.

#### Scenario: API error results in unavailable message
- **WHEN** `/api/recommend` returns a response with a non-empty `error` field
- **THEN** the item slot shows a muted unavailable message, not a prominent error alert

#### Scenario: Network failure results in unavailable message
- **WHEN** the fetch call for an item throws or rejects
- **THEN** the item slot shows a muted unavailable message without crashing the panel
