## Processing $questionnaire operation

| item            | questionnaireItem                 | notes  |
|-----------------|-----------------------------------|----------------------------------------------------------------|
| pattern[x]      | sets initial[x], visibility false | Because questionnaireItem.initial[x] is a subset of pattern[x], we have rules to coerce |
| fixed[x]        | sets initial[x], visibility false | Because questionnaireItem.initial[x] is a subset of fixed[x], we have rules to coerce   |
| defaultValue[x] | sets inital[x], visibility true   |        |

Process each element in the snapshot:
* If the element is in the differential, or min > 0:
  * Create a questionnaire item, and
    * If the element has pattern[x] or fixed[x] make the item hidden
    * If the element does not have pattern[x] or fixed[x] make the item visible
    * If pattern[x] or fixed[x] refers to a complex data type, see "Mapping ElementDefinition data types" below
  * For the rest of questionnaire item details:
    * QuestionnaireItem.linkId => generate some unique id
    * QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where:
      * "full element path" is path unless the path is a choice type (e.g. 'Observation.value[x]')
      * "full element path" is path with `[x]` replaced with the first (and only) type.code
    * QuestionnaireItem.code => Not used
    * QuestionnaireItem.prefix => Not used
    * QuestionnaireItem.text =>
        * Short description from SD
        * Element label; or
        * "Stringify" the path
    * QuestionnaireItem.type (should always be primitive type) =>
        * If the element type is specified in the differential, map to Questionnaire.type
        * If the element type is not specified in the differential, use the snapshot type and map to Questionnaire.type
        * If pattern[x] or fixed[x] refers to a code, treat as a coding/questionnaire choice (note: during $extract need to map this type back to code) -- or consider similar with data type string?
        * If element type is a complex type, see "Mapping ElementDefinition data types" below
    * QuestionnaireItem.required => if (element.min > 0)
    * QuestionnaireItem.repeats => if (element.max > 1)
    * QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
    * QuestionnaireItem.maxLength => element.maxLength (if type is a string)
    * QuestionnaireItem.initialValue => From featureExpression (if available)
    * QuestionnaireItem.answerOption => build if the element has a binding to a VS

    For each case-feature definition/profile, create a group of questionnaire items. There must be at least one questionnaire item per item in the snapshot that have a cardinality of at least 1..*

    ### Mapping ElementDefinition data types to Questionnaire Items
    * To see a mapping of FHIR primitive types to Questionnaire answer value types and QuestionnaireItem.type, visit https://docs.google.com/spreadsheets/d/1YmmW28fDX0VsSlQAVsK2p9bbkV3hxhxnUaUCiRKAL6M/edit?usp=sharing
    * For complex data types with non-primitive data types, $questionnaire should be applied to the SD of the data type and returned as a group of questionnaire items

    Example
    If an element has a data type of "Period" for the value, the Questionnaire will have a group of items that represents Period with the following:
    * Item with type = 'dateTime' and definition = url#root.valuePeriod.start to represent Period.start
    * Item with type = 'dateTime' and definition = url#root.valuePeriod.end to represent Period.end






