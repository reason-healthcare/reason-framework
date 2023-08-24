Instance: WeightObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for supportedOnly = true parameter and fixed[x] element"
* insert QuestionnaireMetaData(WeightObservationExpected)
* item[+]
  * insert QuestionnaireItemMeta(WeightObservationExpected, Observation)
  * type = #group
  * text = "Observation"
  * item[+]
    * insert QuestionnaireItemMeta(WeightObservationExpected, Observation.code)
    * extension[questionnaire-hidden].valueBoolean = true
    * text = "Body Weight"
    * type = #choice
    * required = true
    * initial.valueCoding = $loinc#29463-7 "Body Weight"
