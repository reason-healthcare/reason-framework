Instance: VitalSignsObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for bound elements"
* insert QuestionnaireMetaData(VitalSignsObservationExpected)
* item[+]
  * linkId = "Observation"
  * type = #group
  * definition = "http://example.org/StructureDefinition/VitalSignsObservation#Observation"
  * text = "Observation"
  * item[+]
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/VitalSignsObservation#Observation.code"
    * text = "Respiratory rate | Heart rate | Body temperature | Body height +"
    * type = #choice
    * required = true
    * answerValueSet =  Canonical(observation-vitalsignresult)
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/VitalSignsObservation#Observation.status"
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = Canonical(observation-status|4.0.1)
