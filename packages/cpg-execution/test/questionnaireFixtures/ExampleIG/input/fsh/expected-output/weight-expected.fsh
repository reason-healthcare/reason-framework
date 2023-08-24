Instance: WeightObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for supportedOnly = true parameter and fixed[x] element"
* insert QuestionnaireMetaData(WeightObservationExpected)
* item[+]
  * linkId = "Observation"
  * type = #group
  * definition = "http://example.org/StructureDefinition/WeightObservation#Observation"
  * text = "Observation"
  * item[+]
    * linkId = "Observation.code"
    * extension[questionnaire-hidden].valueBoolean = true
    * definition = "http://example.org/StructureDefinition/WeightObservation#Observation.code"
    * text = "Body Weight"
    * type = #choice
    * required = true
    * initial.valueCoding = $loinc#29463-7 "Body Weight"
    * answerValueSet = $loinc