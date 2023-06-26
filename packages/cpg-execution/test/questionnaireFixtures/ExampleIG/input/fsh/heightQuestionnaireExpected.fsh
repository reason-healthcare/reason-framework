Instance: HeightQuestionnaire
InstanceOf: Questionnaire
Usage: #example
* status = #draft
* item[+]
  * linkId = "Observation.code"
  * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.code"
  * type = #coding
  * initial
    * valueCoding = http://loinc.org#8302-2 "Body Height"
