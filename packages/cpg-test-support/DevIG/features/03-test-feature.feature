Feature: $apply operation
  Scenario: Check for recommentation
    Given 'ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient3Scenario'
    Then no activites should have been recommended