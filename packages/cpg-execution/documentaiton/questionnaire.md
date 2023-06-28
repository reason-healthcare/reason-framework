## Processing $questionnaire operation

| item  | questionnaireItem | notes |
| ----- | ----------------- | ----- |
| pattern[x] | sets initial[x], visibility false | Because questionnaireItem.initial[x] is a subset of pattern[x], we have rules to coerce |
| fixed[x] | sets initial[x], visibility false | Because questionnaireItem.initial[x] is a subset of fixed[x], we have rules to coerce |
| defaultValue[x] | sets inital[x], visibility true | |

Process each element in the snapshot:
* If the element is in the differential, or min > 0:
  * Create a questionnaire item, and
    * If the element has pattern[x] or fixed[x] make the item hidden
    * If the element does not have pattern[x] or fixed[x] make the item visible
  * For the rest of questionnaire item details:
    * QuestionnaireItem.linkId => generate some unique id
    * QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where:
      * "full element path" is path unless the path is a choice type (e.g. 'Observation.value[x]')
      * "full element path" is path with `[x]` replaced with the first (and only) type.code
    * QuestionnaireItem.code => Not used
    * QuestionnaireItem.prefix => Not used
    * QuestionnaireItem.text =>
        * (may remove) Context from where the corresponding data-requirement is used with a special extension (e.g. PlanDefinition.action.input[extension]...); or
        * Element label; or
        * (maybe remove) "Stringify" the path
    * QuestionItem.type (should always be primitive type) =>
        * If the element type is specified in the differential, map to Questionnaire.type
        * If the element type is not specified in the differential, use the snapshot type and map to Questionnaire.type
    * QuestionnaireItem.required => if (element.min > 0)
    * QuestionnaireItem.repeats => if (element.max > 1)
    * QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
    * QuestionnaireItem.maxLength => element.maxLength (if type is a string)
    * QuestionnaireItem.initialValue => From featureExpression (if available)
    * QuestionnaireItem.answerOption => build if the element has a binding to a VS

    For each case-feature definition/profile, create a group of questionnaire items. There must be at least one questionnaire item per item in the snapshot that have a cardinality of at least 1..*

    ## TODO: Test Cases
    Test the following:
    * The resource returned should be a questionnaire
    * At least one group of items should be returned
    * All snapshot elements with a card of 1 should have corresponding item definition
    * All differential elements should have corresponding item definition
    * Basic item properties are correct: definition, type
    * Simple item properties are correct: label, required, repeats, maxLength, answerValueSet
    *  Element with pattern[x] or fixed[x] has hidden extension and an initial value?
    * featureExpression testing
