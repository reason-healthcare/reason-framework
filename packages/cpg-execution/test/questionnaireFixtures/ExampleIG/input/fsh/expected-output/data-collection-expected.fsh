Instance: DataCollectionObservationExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Simple test case with fixed[x]"
* url = "http://questionnaire-processor/Questionnaire/DataCollectionObservationExpected"
* status = #draft
* item[+]
  * linkId = "Observation"
  * type = #group
  * definition = "http://example.org/StructureDefinition/Observation#Observation"
  * text = "Observation"
  * item[+]
    * linkId = "Observation.code"
    * definition = "http://example.org/StructureDefinition/DataCollectionObservation#Observation.code"
    * text = "Type of observation (code / type)"
    * type = #open-choice
    * required = true
    * answerValueSet = Canonical(observation-codes)
  * item[+]
    * linkId = "Observation.status"
    * definition = "http://example.org/StructureDefinition/Observation#Observation.status"
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * extension
      * url = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
      * valueBoolean = true
    * initial.valueCoding = http://hl7.org/fhir/observation-status#final "Final"
  * item[+]
    * linkId = "Observation.valueString"
    * definition = "http://example.org/StructureDefinition/Observation#Observation.initial.valueString"
    * type = #string
    * text = "Observation valueString"
    * extension
      * url = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
      * valueBoolean = true
    * initial.valueString = "hello"
  * item[+]
    * linkId = "Observation.valueBoolean"
    * definition = "http://example.org/StructureDefinition/Observation#"
    * type = #boolean
    * text = "Observation valueBoolean"
    * extension
      * url = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
      * valueBoolean = true
    * initial.valueBoolean = true
  * item[+]
    * linkId = "Observation.valueInteger"
    * definition = "http://example.org/StructureDefinition/Observation#Observation.initial.valueInteger"
    * type = #integer
    * text = "Observation valueInteger"
    * extension
      * url = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
      * valueBoolean = true
    * initial.valueInteger = 5
  * item[+]
    * linkId = "Observation.valueDateTime"
    * definition = "http://example.org/StructureDefinition/Observation#Observation.initial.valueDateTime"
    * type = #dateTime
    * text = "Observation valueDateTime"
    * extension
      * url = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
      * valueBoolean = true
    * initial.valueDateTime = "2023-08-23"
  // * item[+]
  //   * linkId = "Observation.valueQuantity"
  //   * definition = "http://example.org/StructureDefinition/Observation#Observation.initial.valueQuantity"
  //   * type = #quantity
  //   * text = "Observation valueQuntity"
  //   * extension
  //     * url = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
  //     * valueBoolean = true
  //   * initial.valueQuantity
  //     * value = 55
  //     * system = "http://unitsofmeasure.org"
  //     * code = "mm"
  // * item[+]
  //   * linkId = "Observation.subject"
  //   * definition = "http://example.org/StructureDefinition/Observation#Observation.subject"
  //   * type = #reference
    //  * text = "Who and/or what the observation is about"
      // extension
      // * url = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
      // * valueBoolean = true
  //   * initial.valueReference = Reference(Patient/patient-1) // reference = "patient1"
  * item[+]
    * linkId = "Observation.category"
    * definition = "http://example.org/StructureDefinition/Observation#Observation.category"
    * type = #choice
    * text = "Classification of  type of observation"
    * text = "Observation valueCoding"
    * extension
      * url = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
      * valueBoolean = true
    * initial.valueCoding = http://terminology.hl7.org/CodeSystem/observation-category#vital-signs "Vital Signs"