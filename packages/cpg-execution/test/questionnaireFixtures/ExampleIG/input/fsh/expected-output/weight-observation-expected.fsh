Instance: WeightObservationExpected
InstanceOf: Questionnaire
Usage: #example
* status = #draft
* item[+]
  * linkId = "WeightQuestionnaireGroup"
  * type = #group
  * item[+]
    * linkId = "Observation.valueQuantity"
    * definition = "http://example.org/StructureDefinition/WeightObservation#Observation.valueQuantity"
    * text = "Value"
    * type = #quantity
    * required = true
