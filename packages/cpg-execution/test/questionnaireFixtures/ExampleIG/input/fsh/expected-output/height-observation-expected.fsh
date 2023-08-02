Instance: HeightObservationExpected
InstanceOf: Questionnaire
Usage: #example
* description = "Questionnaire generated from http://example.org/StructureDefinition/HeightObservation"
* url = "http://questionnaire-processor/Questionnaire/HeightObservationExpected"
* status = #draft
* item[+]
  * linkId = "HeightQuestionnaireGroup"
  * type = #group
  * definition = "http://example.org/StructureDefinition/HeightObservation#Observation"
  * text = "Observation"
  * item[+]
    * extension[questionnaire-hidden].valueBoolean = true
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.code"
    * text = "Code"
    * type = #choice
    * initial
      * valueCoding = http://loinc.org#8302-2 "Body Height"
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.status"
    * text = "Status"
    * type = #choice
