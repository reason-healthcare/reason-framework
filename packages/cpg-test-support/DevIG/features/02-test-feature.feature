Feature: $apply operation
  Scenario: Check for recommentation
    Given 'ExampleRecommendationDefinition' is loaded
    When apply is called with context 'Patient2Scenario'
    Then "ReportUnder18" should have been recommended
    # And select "at-most-one" of the following actions should be present
    # | Order Both Medications |
    # | Order Medication 4 |

    When "Recommend Medication 3" is selected
    Then "RecommendMedication3" should have been recommended
    And "OrderMedication3" should have been recommended
