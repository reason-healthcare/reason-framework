Instance: HeightObservationExpected
InstanceOf: Questionnaire
Usage: #example
* status = #draft
* item[+]
  * linkId = "HeightQuestionnaireGroup"
  * type = #group
  * item[+]
    * extension[questionnaire-hidden].valueBoolean = true
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.code"
    * text = "Code"
    * type = #display
    * initial
      * valueCoding = http://loinc.org#8302-2 "Body Height"
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.status"
    * text = "Status"
    * type = #choice
