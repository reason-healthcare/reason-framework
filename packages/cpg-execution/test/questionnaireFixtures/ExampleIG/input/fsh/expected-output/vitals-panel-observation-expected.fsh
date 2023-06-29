Instance: VitalsPanelObservationExpected
InstanceOf: Questionnaire
Usage: #example
* status = #draft
* item[+]
  * linkId = "VitalsPanelQuestionnaireGroup"
  * type = #group
  * item[+]
    * linkId = "Observation.hasMember"
    * definition = "http://example.org/StructureDefinition/VitalsPanelObservation#Observation.hasMember"
    * text = "Has Member"
    * type = #reference
    * required = true
    * repeats = true
  * item[+]
    * linkId = "Observation.valueString"
    * definition = "http://example.org/StructureDefinition/VitalsPanelObservation#Observation.valueString"
    * text = "Value"
    * type = #string
    * maxLength = 50
