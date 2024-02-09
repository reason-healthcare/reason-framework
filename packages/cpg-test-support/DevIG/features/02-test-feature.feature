Feature: $apply operation
  Scenario: Check for recommentation
    Given 'http://example.org/PlanDefinition/ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient2Scenario'
    Then "http://example.org/ActivityDefinition/ReportUnder18" should have been recommended
