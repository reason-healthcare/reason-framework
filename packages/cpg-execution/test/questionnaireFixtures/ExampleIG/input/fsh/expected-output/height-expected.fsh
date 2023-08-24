Instance: HeightObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Simple test case with fixed[x]"
* insert QuestionnaireMetaData(HeightObservationExpected)
* item[+]
  * linkId = "Observation"
  * type = #group
  * definition = "http://example.org/StructureDefinition/HeightObservation#Observation"
  * text = "Observation"
  * item[+]
    * extension[questionnaire-hidden].valueBoolean = true
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.code"
    * text = "Body Height"
    * type = #choice
    * required = true
    * initial.valueCoding = http://loinc.org#8302-2 "Body Height"
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.status"
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = Canonical(observation-status)