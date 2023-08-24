Instance: VitalSignsObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for bound elements"
* insert QuestionnaireMetaData(VitalSignsObservationExpected)
* item[+]
  * insert QuestionnaireItemMeta(VitalSignsObservationExpected, Observation)
  * type = #group
  * text = "Observation"
  * item[+]
    * insert QuestionnaireItemMeta(VitalSignsObservation, Observation.code)
    * text = "Respiratory rate | Heart rate | Body temperature | Body height +"
    * type = #choice
    * required = true
    * answerValueSet =  Canonical(observation-vitalsignresult)
  * item[+]
    * insert QuestionnaireItemMeta(VitalSignsObservation, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = Canonical(observation-status)
