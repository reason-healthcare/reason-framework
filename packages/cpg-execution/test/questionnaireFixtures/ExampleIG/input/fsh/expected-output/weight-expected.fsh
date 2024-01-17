Instance: WeightExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for supportedOnly = true parameter and fixed[x] element"
* insert QuestionnaireMetaData(WeightExpected)
* item[+]
  * insert QuestionnaireItemMeta(WeightObservation, Observation)
  * type = #group
  * text = "Measurements and simple assertions"
  * item[+]
    * insert QuestionnaireItemMeta(WeightObservation, Observation.code)
    * extension[questionnaire-hidden].valueBoolean = true
    * text = "Body Weight"
    * type = #open-choice
    * required = true
    * initial.valueCoding = $loinc#29463-7 "Body Weight"
    * answerValueSet = Canonical(observation-codes)
