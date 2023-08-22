Instance: HeightObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Simple test case with fixed[x]"
* url = "http://questionnaire-processor/Questionnaire/HeightObservationExpected"
* status = #draft
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
    * type = #choice // or coding since fixed?
    * required = true
    * initial.valueCoding.coding = http://loinc.org#8302-2 "Body Height"
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/HeightObservation#Observation.status"
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-status|4.0.1"