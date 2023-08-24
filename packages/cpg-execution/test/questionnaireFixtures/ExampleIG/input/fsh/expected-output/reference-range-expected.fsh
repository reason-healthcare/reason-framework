Instance: ReferenceRangeExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for nested elements"
* insert QuestionnaireMetaData(ReferenceRangeExpected)
* item[+]
  * insert QuestionnaireItemMeta(ReferenceRangeObservation, Observation)
  * type = #group
  * text = "Observation"
  * item[+]
    * insert QuestionnaireItemMeta(ReferenceRangeObservation, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = Canonical(observation-status)
  * item[+]
    * insert QuestionnaireItemMeta(ReferenceRangeObservation, Observation.code)
    * text = "Type of observation (code / type)"
    * type = #open-choice
    * required = true
    * answerValueSet = Canonical(observation-codes)
  * item[+]
    * insert QuestionnaireItemMeta(ReferenceRangeExpected, Observation.referenceRange)
    * type = #group
    * required = true
    * item[+]
      * insert QuestionnaireItemMeta(ReferenceRangeExpected, Observation.referenceRange.text)
      * type = #string
      * required = true