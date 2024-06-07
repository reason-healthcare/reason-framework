# Processing $questionnaire and $populate operations

## $questionnaire
See [core $questionnaire operation](https://hl7.org/fhir/R4/structuredefinition-operation-questionnaire.html)

Propose parameter "minimal" where:

  Elements from the structure definition should be processed to questionnaire items if:
  1. The element is a part of the differential;
  2. The element is a part of the snapshot and has a cardinality of at least 1..\* (min >1). Nested child elements with min > 1 should also be included if parent has min > 1.

Optionally, the parameter "supportedOnly" may be supplied. If true, the above applies only to elements with must support flags.


| elementDefinition                                     | questionnaireItem                                             | notes                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| pattern[x]                                            | hidden true                                  |              |
| fixed[x]                                              | hidden true                                  |                |
| defaultValue[x]                                       | sets inital[x], hidden false                                  |                                                                                                      |
| {structureDefinition.url}#{element.path}              | definition                                                    | for choice type paths, replace [x] with element type.code[0]                                         |
| short description; element label; or stringified path | text                                                          |                                                                                                      |
| type                                                  | type                                                          | see [ElementDefinition Mappings](#mapping-elementdefinition-data-types-to-questionnaire-items)       |
| min > 0                                               | required                                                      |                                                                                                      |
| max > 1                                               | repeats                                                       |                                                                                                      |
| maxLength                                             | maxLength                                                     | apply if type = string                                                                               |
| binding.valueSet                                      | expaneded valueSet used as answerOption, set type as 'choice' |                                                                                                      |
| ??                                                    | readOnly                                                      |                                                                                                      |

Process elements from the structure definition resource:

- For each element to process, create a questionnaire item
  - If the element has pattern[x] or fixed[x], make the item hidden
  - For the rest of questionnaire item properties:
    - QuestionnaireItem.linkId => generate some unique id
    - QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where:
      - "full element path" is path unless the path is a choice type (e.g. 'Observation.value[x]')
      - "full element path" is path with `[x]` replaced with the first (and only) type.code
    - QuestionnaireItem.code => Not used
    - QuestionnaireItem.prefix => Not used
    - QuestionnaireItem.text in order of preference =>
      - Element short description;
      - Element label; or
      - "Stringify" the path
    - QuestionnaireItem.type (should always be primitive type) =>
      - If the element type is specified in the differential, map to Questionnaire.type
      - If the element type is not specified in the differential, use the snapshot type and map to Questionnaire.type
      - If of type code, treat as a coding with type 'choice'(note: during $extract need to map this type back to code)
      - For a more detailed mapping of primitive and complex data types, see [ElementDefinition Mappings](#mapping-elementdefinition-data-types-to-questionnaire-items)
    - QuestionnaireItem.required => if (element.min > 0)
    - QuestionnaireItem.repeats => if (element.max > 1)
    - QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
    - QuestionnaireItem.maxLength => element.maxLength (if type is a string)
    - QuestionnaireItem.answerOption => expanded value set binding <!-- How should example binding be handled? open choice? -->
- Ideally, the snapshot element will be used as a fallback for properties missing on differential elements. <!-- How should properties like "type" be handled, where the snapshot element definition may include multiple types -->

## $populate

See [SDC $populate operation](https://hl7.org/fhir/uv/sdc/OperationDefinition-Questionnaire-populate.html)

A pre-populated questionnaire response can be generated using the resulting quesitonnaire items and corresponding element definitions along with [CPG feature expression](https://hl7.org/fhir/uv/cpg/StructureDefinition-cpg-featureExpression.html) and patient context.

| elementDefinition                                     | questionnaireResponseItem                                          | notes                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| pattern[x]                                            | answer.value[x]                                | Because questionnaireResponse.item.answer.value[x] is a subset of pattern[x], we have rules to coerce              |
| fixed[x]                                              |  answer.value[x]                                 | Because questionnaireResponse.item.answer.value[x] is a subset of fixed[x], we have rules to coerce                |
| cpg-featureExpression extension value on SD                      | answer.value[x]    | Because questionnaireResponse.item.answer.value[x] is a subset of fixed[x], we have rules to coerce |

Use element definitions and case feature expression values to set answer.value[x] in order of preference =>
  - Use pattern[x] or fixed[x]
  - Use featureExpression (if available)
  - Use defaultValue[x] if the element does not have pattern[x] or fixed[x]

### Use of Questionnaire Response with definition based extraction ($extract)

When extracted, if the QuestionnaireResponse supplies a value for the case feature, the feature will be
1. Updated if the feature expression was asserted; Or
2. Created if
    a. The feature was inferred; Or
    b. The feature expression returned null

See [SDC Definition Based Extraction](https://hl7.org/fhir/uv/sdc/extraction.html#definition-based-extraction)

### Mapping ElementDefinition data types to Questionnaire Items

- See mappings of FHIR primitive types to QuestionnaireItem.initialValue[x] and QuestionnaireItem.type [here](https://docs.google.com/spreadsheets/d/1YmmW28fDX0VsSlQAVsK2p9bbkV3hxhxnUaUCiRKAL6M/edit?usp=sharing)
- For non-primitive, complex data types, $questionnaire should be applied to the SD of the data type and returned as a subgroup of questionnaire items
- See `./rangeQuestionnaireRepresentation` as an example questionnaire.item representation of the Range data type https://www.hl7.org/fhir/datatypes.html#Range
