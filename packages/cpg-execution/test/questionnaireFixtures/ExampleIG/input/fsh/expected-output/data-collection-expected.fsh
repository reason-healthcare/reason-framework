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
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueCoding = #final
    * answerValueSet = Canonical(observation-status)
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.category)
    * type = #choice
    * text = "Classification of  type of observation"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueCoding = $observation-category#vital-signs "Vital Signs"
    * answerValueSet = Canonical(observation-category)
    * repeats = true
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.valueBoolean)
    * type = #boolean
    * text = "Actual result"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueBoolean = true
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.valueDateTime)
    * type = #dateTime
    * text = "Actual result"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueDateTime = "2023-08-23"
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.valueInteger)
    * type = #integer
    * text = "Actual result"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueInteger = 5
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.valueString)
    * type = #string
    * text = "Actual result"
    * extension
      * url = Canonical(questionnaire-hidden)
      * valueBoolean = true
    * initial.valueString = "hello"
  * item[+]
    * insert QuestionnaireItemMeta(DataCollectionObservation, Observation.code)
    * text = "Type of observation (code / type)"
    * type = #open-choice
    * required = true
    * answerValueSet = Canonical(observation-codes)