Instance: WrittenAssessmentObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for simple item properties such as required, repeats, and maxLength"
* insert QuestionnaireMetaData(WrittenAssessmentObservationExpected)
* item[+]
  * insert QuestionnaireItemMeta(WrittenAssessmentObservation, Observation)
  * type = #group
  * text = "Measurements and simple assertions"
  * item[+]
    * insert QuestionnaireItemMeta(WrittenAssessmentObservation, Observation.category)
    * text = "Classification of  type of observation"
    * required = true
    * repeats = true
    * type = #choice
    * answerValueSet = Canonical(observation-category)
  * item[+]
    * insert QuestionnaireItemMeta(WrittenAssessmentObservation, Observation.valueString)
    * text = "Measurements and simple assertions valueString"
    * type = #string
    * maxLength = 20
  * item[+]
    * insert QuestionnaireItemMeta(WrittenAssessmentObservation, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = Canonical(observation-status)
  * item[+]
    * insert QuestionnaireItemMeta(WrittenAssessmentObservation, Observation.code)
    * text = "Type of observation (code / type)"
    * type = #open-choice
    * required = true
    * answerValueSet = Canonical(observation-codes)
    // set to open choice with example VS for binding?
