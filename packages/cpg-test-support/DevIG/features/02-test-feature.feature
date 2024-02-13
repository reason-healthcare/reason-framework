Feature: $apply operation
  Scenario: Check for recommentation
    Given 'http://example.org/PlanDefinition/ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient2Scenario'
    Then "http://example.org/ActivityDefinition/ReportUnder18" should have been recommended
    And select "at-most-one" of the following should have been recommended
    | http://example.org/ActivityDefinition/OrderMedication3 |
    | http://example.org/ActivityDefinition/OrderMedication4 |