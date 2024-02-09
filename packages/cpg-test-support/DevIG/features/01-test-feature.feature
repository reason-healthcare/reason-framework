Feature: $apply operation
  Scenario: Check for recommentation
    Given 'http://example.org/PlanDefinition/ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient1Scenario'
    Then "http://example.org/ActivityDefinition/ReportOver18" should have been recommended
    And "at-most-one" of the following should have been recommended
    | http://example.org/ActivityDefinition/OrderMedication1 |
    | http://example.org/ActivityDefinition/OrderMedication2 |