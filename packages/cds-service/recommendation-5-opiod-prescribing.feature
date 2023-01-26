
  Scenario: Recommendation 5 from the CDC Opioid Prescribing Guideline
    Given Patient is 18 or over
    And Patient does not have findings indicating limited life expectancy
    And Patient does not have orders for therapies indicating end of life care
    And Patient Morphine Milligram Equivalent (MME) greater than or equal to 50

    When Provider is prescribing an opioid analgesic with ambulatory misuse potential in the outpatient setting
    And Prescription is for treating chronic pain

    Then Recommend prescribing the lowest effective dosage










    