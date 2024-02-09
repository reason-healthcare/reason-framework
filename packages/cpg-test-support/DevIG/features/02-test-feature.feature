Feature: $apply operation
  Scenario: Check for recommentation
    Given 'http://example.org/PlanDefinition/ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient2Scenario'
    Then "http://example.org/ActivityDefinition/ReportUnder18" should have been recommended
    And "at-most-one" of "http://example.org/ActivityDefinition/OrderMedication3" and "http://example.org/ActivityDefinition/OrderMedication4" should be recommended
