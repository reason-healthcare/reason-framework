Instance: WrittenAssessmentObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for simple item properties such as required, repeats, and maxLength"
* status = #draft
* item[+]
  * linkId = "WrittenAssessmentQuestionnaireGroup"
  * type = #group
  * item[+]
    * linkId = "Observation.category"
    * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation.category"
    * text = "Classification of  type of observation"
    * required = true
    * repeats = true
    * type = #choice
    * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-category"
  * item[+]
    * linkId = "Observation.valueString"
    * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation.valueString"
    * text = "Observation Value String"
    * type = #string
    * required = true
    * maxLength = 20
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation.status"
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-status|4.0.1"
  * item[+]
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/WrittenAssessmentObservation#Observation.code"
    * text = "Type of observation (code / type)"
    * type = #choice
    * required = true
    // set to open choice with example VS for binding?
