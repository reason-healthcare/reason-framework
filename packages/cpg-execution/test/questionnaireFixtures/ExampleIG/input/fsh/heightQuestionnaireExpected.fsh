Instance: HeightQuestionnaire
InstanceOf: Questionnaire
Usage: #example
* status = #draft
* item[+]
  * extension[questionnaire-hidden].valueBoolean = true
  * linkId = "Observation.code"
  * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.code"
  * type = #string
  * initial
    * valueCoding = http://loinc.org#8302-2 "Body Height"
