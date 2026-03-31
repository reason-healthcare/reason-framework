## ADDED Requirements

### Requirement: Recommendation context SHALL use the selected data bundle
The system SHALL build recommendation request `context` from the selected patient data bundle used by the apply flow.

The recommendation `context` SHALL include patient and clinical resources from that bundle when available.

#### Scenario: Data bundle is passed into recommendation requests
- **WHEN** a user reaches the questionnaire step after selecting or uploading patient context
- **THEN** each `POST /api/recommend` request includes `context` equal to the selected data bundle

#### Scenario: Recommendation context updates when selected data bundle changes
- **WHEN** the selected patient data bundle changes before recommendations are fetched
- **THEN** subsequent recommendation requests use the updated bundle as `context`

### Requirement: QuestionnaireResponse SHALL be excluded from recommendation context
The system SHALL NOT construct recommendation `context` from `questionnaireResponseServer`, and SHALL NOT include `QuestionnaireResponse` resources in recommendation `context` by default.

#### Scenario: Questionnaire response is not used as recommendation context
- **WHEN** `QuestionnaireRenderer` renders `RecommendationPanel`
- **THEN** it does not create a context bundle with `entry: [{ resource: questionnaireResponseServer }]`

#### Scenario: Recommendation request contains questionnaire metadata separately
- **WHEN** `RecommendationPanel` calls `POST /api/recommend`
- **THEN** the request includes `questionnaire` and `item` fields while `context` remains the selected data bundle
