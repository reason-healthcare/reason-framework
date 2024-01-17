Instance: WeightCaseFeatureExpected
InstanceOf: Questionnaire
Usage: #example
* description = "Test case for a caseFeatureDefinition with the featureExpression extension"
* insert QuestionnaireMetaData(WeightCaseFeatureExpected)
* item
  * insert QuestionnaireItemMeta(WeightCaseFeature, Observation)
  * text = "Measurements and simple assertions"
  * type = #group
  * item[0]
    * insert QuestionnaireItemMeta(WeightCaseFeature, Observation.valueQuantity)
    * text = "Actual result"
    * type = #quantity
    * initial.valueQuantity
      * value = 70
      * unit = "kg"
      * system = $unitsofmeasure
      * code = #kg
  * item[+]
    * insert QuestionnaireItemMeta(WeightCaseFeature, Observation.status)
    * text = "registered | preliminary | final | amended +"
    * required = true
    * type = #choice
    * answerValueSet = Canonical(observation-status)
  * item[+]
    * insert QuestionnaireItemMeta(WeightCaseFeature, Observation.code)
    * text = "Type of observation (code / type)"
    * required = true
    * type = #open-choice
    * answerValueSet = Canonical(observation-codes)