Instance: WrittenAssessmentObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for simple item properties such as required, repeats, and maxLength"
* insert QuestionnaireMetaData(WrittenAssessmentObservationExpected)
* item[+]
  * linkId = "Observation"
  * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation"
  * type = #group
  * text = "Observation"
  * item[+]
    * linkId = "Observation.category"
    * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation.category"
    * text = "Classification of  type of observation"
    * required = true
    * repeats = true
    * type = #choice
    * answerValueSet = Canonical(observation-category)
  * item[+]
    * linkId = "Observation.valueString"
    * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation.valueString"
    * text = "Observation valueString"
    * type = #string
    * maxLength = 20
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation.status"
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = Canonical(observation-status)
  * item[+]
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation.code"
    * text = "Type of observation (code / type)"
    * type = #open-choice
    * required = true
    * answerValueSet = Canonical(observation-codes)
    // set to open choice with example VS for binding?
