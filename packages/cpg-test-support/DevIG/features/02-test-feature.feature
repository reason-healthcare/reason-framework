Feature: $apply operation
  Scenario: Check for recommentation
    Given 'ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient2Scenario'
    Then "ReportUnder18" should have been recommended
    And select "at-most-one" of the following should have been recommended
    | OrderMedication3 |
    | OrderMedication4 |