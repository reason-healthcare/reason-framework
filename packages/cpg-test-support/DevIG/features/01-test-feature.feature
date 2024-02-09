Feature: $apply operation
  Scenario: Check for recommentation
    Given 'http://example.org/PlanDefinition/ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient1Scenario'
    Then "http://example.org/ActivityDefinition/ReportOver18" should have been recommended
    And "at-most-one" of "http://example.org/ActivityDefinition/OrderMedication1" and "http://example.org/ActivityDefinition/OrderMedication1" should be recommended