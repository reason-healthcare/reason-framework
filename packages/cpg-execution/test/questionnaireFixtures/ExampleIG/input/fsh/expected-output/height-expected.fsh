Instance: HeightExpected
InstanceOf: Questionnaire
Usage: #example
Description: "Simple test case with fixed[x]"
* insert QuestionnaireMetaData(HeightExpected)
* item[+]
  * insert QuestionnaireItemMeta(HeightObservation, Observation)
  * type = #group
  * text = "Measurements and simple assertions"
  * item[+]
    * extension[questionnaire-hidden].valueBoolean = true
    * insert QuestionnaireItemMeta(HeightObservation, Observation.code)
    * text = "Body Height"
    * type = #choice
    * required = true
    * initial.valueCoding = http://loinc.org#8302-2 "Body Height"
  * item[+]
    * insert QuestionnaireItemMeta(HeightObservation, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * type = #choice
    * required = true
    * answerValueSet = Canonical(observation-status)