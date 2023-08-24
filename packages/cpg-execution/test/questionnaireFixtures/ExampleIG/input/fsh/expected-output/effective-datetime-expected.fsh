Instance: EffectiveDateTimeExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Test case for processing of complex data types"
* insert QuestionnaireMetaData(EffectiveDateTimeExpected)
* item[+]
  * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation)
  * type = #group
  * text = "Observation"
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
    * item[+] //start and end were already flattened as a part of the differential because of pattern[x], but note's data structure was not flatted b/c of lack of fixed values
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
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.note.authorString)
      * type = #string
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.note.time)
      * type = #dateTime
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveDateTimeObservation, Observation.note.text)
      * type = #string
      * required = true
