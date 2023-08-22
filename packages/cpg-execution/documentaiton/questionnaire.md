## Processing $questionnaire operation

Elements from the structure definition should be processed to questionnaire items if:
  1. The element is a part of the differential
  2. The element is a part of the snapshot and has a cardinality of at least 1..* (min >1). Nested child elements with min > 1 should also be included if parent has min > 1.
  3. Optionally, the parameter "supportedOnly" can be supplied to the operation. If true, the above applies only to elements with must support flags.

For each case-feature definition/profile, create a group of questionnaire items. Add additional questionnaire item groupings for:
  1. Parent elements with one or more nested children elements i.e. if element path is nested beyond element.x, group the element.x children together
  2. Complex data types see [ElementDefinition Mappings](#mapping-elementdefinition-data-types-to-questionnaire-items)

| elementDefinition | questionnaireItem | notes |
| -----------------| -----------------| -------|
| pattern[x] | sets initial[x], hidden true | Because questionnaireItem.initial[x] is a subset of pattern[x], we have rules to coerce |
| fixed[x] |  sets initial[x], hidden true | Because questionnaireItem.initial[x] is a subset of fixed[x], we have rules to coerce |
| defaultValue[x]| sets inital[x], hidden false| |
| {structureDefinition.url}#{element.path} | definition | for choice type paths, replace [x] with element type.code[0] |
| short description; element label; or stringified path | text | |
| type | type | see [ElementDefinition Mappings](#mapping-elementdefinition-data-types-to-questionnaire-items) |
| min > 0 | required | |
| max > 1 | repeats | |
| maxLength | maxLength | apply if type = string |
| extension.cpg-featureExpression | sets initial[x] | see [ElementDefinition Mappings](#mapping-elementdefinition-data-types-to-questionnaire-items) |
| binding.valueSet & binding.strength = required, preferred, or extensibile | translates to answerValueSet, set type as 'choice' | |
| ??| readOnly | |
| ??| answerOption | |

Process each element from the structure definition:
* If the element is in the differential or snapshot min > 0, create a questionnaire item:
  * If the element has pattern[x] or fixed[x] make the item hidden and set initial[x]
  * If the element does not have pattern[x] or fixed[x] make the item visible
  * For the rest of questionnaire item properties:
    * QuestionnaireItem.linkId => generate some unique id
    * QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where:
      * "full element path" is path unless the path is a choice type (e.g. 'Observation.value[x]')
      * "full element path" is path with `[x]` replaced with the first (and only) type.code
    * QuestionnaireItem.code => Not used
    * QuestionnaireItem.prefix => Not used
    * QuestionnaireItem.text =>
        * Element short description;
        * Element label; or
        * "Stringify" the path
    * QuestionnaireItem.type (should always be primitive type) =>
        * If the element type is specified in the differential, map to Questionnaire.type
        * If the element type is not specified in the differential, use the snapshot type and map to Questionnaire.type
        * If pattern[x] or fixed[x] refers to a code, treat as a coding with type 'choice'(note: during $extract need to map this type back to code) -- or consider similar with data type string?
        Should type actually be coding if the value is fixed?
        * If element has a binding to a VS, set type as 'choice'
        * For a more detailed mapping of primitive and complex data types, see [ElementDefinition Mappings](#mapping-elementdefinition-data-types-to-questionnaire-items)
    * QuestionnaireItem.required => if (element.min > 0)
    * QuestionnaireItem.repeats => if (element.max > 1)
    * QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
    * QuestionnaireItem.maxLength => element.maxLength (if type is a string)
    * QuestionnaireItem.initialValue =>
      * From featureExpression (if available) -- Will this require a patient data bundle as a $questionnaire parameter?
      * Use pattern[x], fixed[x], or defaultValue[x]
      * If value is a complex data type, see [ElementDefinition Mappings](#mapping-elementdefinition-data-types-to-questionnaire-items) to process choice type
    * QuestionnaireItem.answerValueSet => if the element has a binding to a VS that is required, preferred, or extensible - should the bound VS still be used for strength = example, but set to type = open-choice?

    ### Mapping ElementDefinition data types to Questionnaire Items
    * To see a mapping of FHIR primitive types to QuestionnaireItem.initialValue[x] and QuestionnaireItem.type, visit https://docs.google.com/spreadsheets/d/1YmmW28fDX0VsSlQAVsK2p9bbkV3hxhxnUaUCiRKAL6M/edit?usp=sharing
    * For complex data types with non-primitive data types, $questionnaire should be applied to the SD of the complex data type and returned as a subgroup of questionnaire items
    * See ./contactQuestionnaireRepresentation as an example questionnaire.item representation of the ContactPoint data type https://www.hl7.org/fhir/datatypes.html#ContactPoint






