Feature: $apply operation
  Scenario: Check for recommentation
    Given 'http://example.org/PlanDefinition/ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient1Scenario'
    Then "http://example.org/ActivityDefinition/ReportOver18" should have been recommended
     And "[selection-behavior]" of "[activity-identifier]" and "[activity-identifier]" should be recommended