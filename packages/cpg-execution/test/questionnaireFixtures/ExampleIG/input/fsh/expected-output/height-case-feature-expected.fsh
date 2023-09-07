Instance: HeightCaseFeatureExpected
InstanceOf: Questionnaire
Usage: #example
* description = "Test case for caseFeatureDefinition with a featureExpression extension"
* insert QuestionnaireMetaData(HeightCaseFeatureExpected)
* item
  * insert QuestionnaireItemMeta(HeightCaseFeature, Observation)
  * text = "Measurements and simple assertions"
  * type = #group
  * item[0]
    * insert QuestionnaireItemMeta(HeightCaseFeature, Observation.valueString)
    * text = "Actual result"
    * type = #string
    * initial.valueString = "165 inches"
  * item[+]
    * insert QuestionnaireItemMeta(HeightCaseFeature, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * required = true
    * type = #choice
    * answerValueSet = Canonical(observation-status)
  * item[+]
    * insert QuestionnaireItemMeta(HeightCaseFeature, Observation.code)
    * text = "Type of observation (code / type)"
    * required = true
    * type = #open-choice
    * answerValueSet = Canonical(observation-codes)