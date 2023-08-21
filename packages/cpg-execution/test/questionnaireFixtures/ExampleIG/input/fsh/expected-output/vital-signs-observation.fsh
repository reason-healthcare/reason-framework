Instance: VitalSignsObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for bound elements"
* status = #draft
* item[+]
  * linkId = "Observation"
  * type = #group
  * definition = "http://example.org/StructureDefinition/VitalSignsObservation#Observation"
  * item[+]
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/VitalSignsObservation#Observation.code"
    * text = "Respiratory rate | Heart rate | Body temperature | Body height +"
    * type = #choice
    * required = true
    * answerValueSet =  "http://hl7.org/fhir/ValueSet/observation-vitalsignresult"
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.status"
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-status|4.0.1"
