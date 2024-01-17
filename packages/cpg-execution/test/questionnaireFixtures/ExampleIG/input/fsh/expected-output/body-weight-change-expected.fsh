Instance: BodyWeightChangeExpected
InstanceOf: Questionnaire
Usage: #example
* description = "Questionnaire generated from http://example.org/StructureDefinition/BodyWeightChangeObservation"
* insert QuestionnaireMetaData(BodyWeightChangeExpected)
* item[+]
  * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation)
  * text = "Measurements and simple assertions"
  * type = #group
  * item[0]
    * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.code)
    * text = "Body Weight Change"
    * required = true
    * type = #group
    * answerValueSet = Canonical(observation-codes)
    * item[+]
      * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.code.coding:BodyWeightCode)
      * text = "Code defined by a terminology system"
      * required = true
      * type = #group
      * item[0]
        * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.code.coding.system)
        * text = "Identity of the terminology system"
        * required = true
        * type = #url
        * extension
          * url = Canonical(questionnaire-hidden)
          * valueBoolean = true
        * initial.valueUri = $chf-codes
      * item[+]
        * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.code.coding.code)
        * text = "Symbol in syntax defined by the system"
        * required = true
        * type = #choice
        * extension
          * url = Canonical(questionnaire-hidden)
          * valueBoolean = true
        * initial.valueCoding.code = #body-weight-change
  * item[+]
    * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.valueQuantity)
    * text = "Actual result"
    * type = #group
    * item[0]
      * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.valueQuantity.value)
      * text = "Numerical value (with implicit precision)"
      * required = true
      * type = #decimal
    * item[+]
      * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.valueQuantity.unit)
      * text = "Unit representation"
      * required = true
      * type = #string
    * item[+]
      * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.valueQuantity.system)
      * text = "System that defines coded unit form"
      * required = true
      * type = #url
      * extension
        * url = Canonical(questionnaire-hidden)
        * valueBoolean = true
      * initial.valueUri = "http://unitsofmeasure.org"
    * item[+]
      * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.valueQuantity.code)
      * text = "kg/d"
      * required = true
      * type = #choice
      * extension
        * url = Canonical(questionnaire-hidden)
        * valueBoolean = true
      * initial.valueCoding.code = #kg/d
  * item[+]
    * insert QuestionnaireItemMeta(BodyWeightChangeObservation, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * required = true
    * type = #choice
    * answerValueSet = Canonical(observation-status)