Feature: $apply operation
  Scenario: Check for recommentation
    Given 'ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient2Scenario'
    Then "ReportUnder18" should have been recommended
    # And select "at-most-one" of the following should have been recommended
    # | RecommendMedication3 |
    # | OrderMedication4 |

    When "RecommendMedication3" is selected
    Then "OrderMedication3" should have been recommended
    And "PatientEducation" should have been recommended
    And select "all" of the following should have been recommended
    | SendWrittenEducation |
    | ProvideVerbalEducation |
