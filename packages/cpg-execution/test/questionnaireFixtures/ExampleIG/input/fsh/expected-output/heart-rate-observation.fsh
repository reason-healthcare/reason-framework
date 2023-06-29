Instance: HeartRateObservationExpected
InstanceOf: Questionnaire
Usage: #example
* status = #draft
* item[+]
  * linkId = "HeartRateQuestionnaireGroup"
  * type = #group
  * item[+]
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/HeartRateObservation#Observation.code"
    * text = "Code"
    * type = #choice
    * answerValueSet =  "http://hl7.org/fhir/ValueSet/observation-vitalsignresult"
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/HeartRateObservation#Observation.status"
    * text = "Status"
    * type = #choice
    * answerValueSet = "https://www.hl7.org/fhir/R4/valueset-observation-status.html"
