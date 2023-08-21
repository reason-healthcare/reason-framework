Instance: WeightObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for supportedOnly = true parameter and fixed[x] element"
* status = #draft
* item[+]
  * linkId = "Observation"
  * type = #group
  * definition = "http://example.org/StructureDefinition/WeightObservation#Observation"
  * item[+]
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/WeightObservation#Observation.code"
    * text = "Body Weight"
    * type = #choice
    * required = true
    * initial.valueCoding = http://loinc.org#29463-7 "Body Weight"
    // set to open choice with example VS for binding?
