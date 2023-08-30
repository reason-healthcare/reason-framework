Instance: DataCollectionExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Simple test case with fixed[x]"
* insert QuestionnaireMetaData(DataCollectionExpected)
* item[+]
  * insert QuestionnaireItemMeta(DataCollectionObservation, Observation)
  * type = #group
  * text = "Measurements and simple assertions"
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.code)
    * text = "Type of observation (code / type)"
    * type = #open-choice
    * required = true
    * answerValueSet = Canonical(observation-codes)
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueCoding = http://hl7.org/fhir/observation-status#final
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.initial.valueString)
    * type = #string
    * text = "Observation valueString"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueString = "hello"
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.initial.valueBoolean)
    * type = #boolean
    * text = "Observation valueBoolean"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueBoolean = true
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.initial.valueInteger)
    * type = #integer
    * text = "Observation valueInteger"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueInteger = 5
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.initial.valueDateTime)
    * type = #dateTime
    * text = "Observation valueDateTime"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueDateTime = "2023-08-23"
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.category)
    * type = #choice
    * text = "Classification of  type of observation"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueCoding = $observation-category#vital-signs "Vital Signs"
    * repeats = true
  // * item[+]  //sushi error : type Coding was expected in place of reference and quantity
  //   * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.initial.valueQuantity)
  //   * type = #quantity
  //   * text = "Observation valueQuntity"
  //   * extension
  //     * url = Canonical(questionnaire-hidden)
  //     * valueBoolean = true
  //   * initial.valueQuantity
  //     * value = 55
  //     * system = "http://unitsofmeasure.org"
  //     * code = #mm
  // * item[+]
 //    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.subject)
  //   * type = #reference
  //   * text = "Who and/or what the observation is about"
  //   * extension
  //     * url = Canonical(questionnaire-hidden)
  //     * valueBoolean = true
  //   * initial.valueReference = Reference(Patient/patient-1)