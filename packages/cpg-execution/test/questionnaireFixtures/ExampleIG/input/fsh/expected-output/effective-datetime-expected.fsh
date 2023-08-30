Instance: EffectiveDateTimeExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for processing of complex data types"
* insert QuestionnaireMetaData(EffectiveDateTimeExpected)
* item[+]
  * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation)
  * type = #group
  * text = "Measurements and simple assertions"
  * item[+]
    * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = Canonical(observation-status)
  * item[+]
    * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.code)
    * text = "Type of observation (code / type)"
    * type = #open-choice
    * required = true
    * answerValueSet = Canonical(observation-codes)
  * item[+]
    * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.effectivePeriod)
    * type = #group
    * text = "Clinically relevant time/time-period for observation"
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.effectivePeriod.start)
      * type = #dateTime
      * extension[questionnaire-hidden].valueBoolean = true
      * initial.valueDateTime = "2023-08-01"
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.effectivePeriod.end)
      * type = #dateTime
      * extension[questionnaire-hidden].valueBoolean = true
      * initial.valueDateTime = "2023-08-23"
  * item[+]
    * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.note)
    * type = #group
    * text = "Comments about the observation"
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.note.authorString)
      * type = #reference
      * text = "Individual responsible for the annotation"
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.note.time)
      * type = #dateTime
      * text = "When the annotation was made"
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.note.text)
      * type = #string
      * required = true
      * text = "The annotation  - text content (as markdown)"
