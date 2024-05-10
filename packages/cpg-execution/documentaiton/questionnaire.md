## Processing $questionnaire operation

Elements from the structure definition should be processed to questionnaire items if:

1. The element is a part of the differential
2. The element is a part of the snapshot and has a cardinality of at least 1..\* (min >1). Nested child elements with min > 1 should also be included if parent has min > 1.
3. Optionally, the parameter "supportedOnly" can be supplied. If true, the above applies only to elements with must support flags.
4. Additionally, if the SD contains inference or assertion logic (CPG feature expressions), and an instantiated case feature is returned based on the data context, each of the case feature properties should be processed to questionnaire items. This will enable conformance with the $extract operation.
Note: Consider parameter on $questionnaire --> "minimal" as boolean narrows element processing by the criteria specified above as opposed to processing all elements.


| elementDefinition                                     | questionnaireItem                                             | notes                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| pattern[x]                                            | sets initial[x], hidden true                                  | Because questionnaireItem.initial[x] is a subset of pattern[x], we have rules to coerce              |
| fixed[x]                                              | sets initial[x], hidden true                                  | Because questionnaireItem.initial[x] is a subset of fixed[x], we have rules to coerce                |
| defaultValue[x]                                       | sets inital[x], hidden false                                  |                                                                                                      |
| {structureDefinition.url}#{element.path}              | definition                                                    | for choice type paths, replace [x] with element type.code[0]                                         |
| short description; element label; or stringified path | text                                                          |                                                                                                      |
| type                                                  | type                                                          | see [ElementDefinition Mappings](#mapping-elementdefinition-data-types-to-questionnaire-items)       |
| min > 0                                               | required                                                      |                                                                                                      |
| max > 1                                               | repeats                                                       |                                                                                                      |
| maxLength                                             | maxLength                                                     | apply if type = string                                                                               |
| extension.cpg-featureExpression                       | sets initial[x], hidden true (unless element is value[x])     | see [Use with Definition based extraction ($extract)](#use-with-definition-based-extraction-extract) |
| binding.valueSet                                      | expaneded valueSet used as answerOption, set type as 'choice' |                                                                                                      |
| ??                                                    | readOnly                                                      |                                                                                                      |

Process elements from the structure definition/feature expression resource:

- For each element to process, create a questionnaire item
  - If the element has pattern[x], fixed[x], or a featureExpression value make the item hidden and set initial[x]
  - If the element does not have pattern[x] or fixed[x] or the element corresponds to the case feature value, make the item visible
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
    - QuestionnaireItem.initialValue in order of preference =>
      - Use pattern[x] or fixed[x]
      - Use defaultValue[x] if the element does not have pattern[x] or fixed[x]
      - Otherwise use featureExpression (if available)
    - QuestionnaireItem.answerOption => expanded value set binding <!-- How should example binding be handled? open choice? -->
- Ideally, the snapshot element will be used as a fallback for properties missing on differential elements and feature expression resources. <!-- How should properties like "type" be handled, where the snapshot element definition may include multiple types -->

### Use with definition based extraction ($extract)

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

### Reason Framework Supported Parameters

| name                          | description                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| contentEndpoint               | used to resolve FHIR resources                                                                                                                                                                                                                                                                                                                                                                                                                       |
| artifactEndpointConfiguration | used to resolve FHIR resources and base definitions. Prioritize over content endpoint. The $questionnaire operation uses element definitions from both profiled resources and base definitions, so a server with core FHIR content may be specificed. See [CRMI Artificat Endpoint Configurable](https://build.fhir.org/ig/HL7/crmi-ig/StructureDefinition-crmi-artifact-endpoint-configurable-operation.html) for further details on configuration. |
| terminologyEndpoint           | used to resolve terminology. If the terminology endpoint is not capable of $expand, an appropriate endpoint should be specified as a configurable and used as a fallback.                                                                                                                                                                                                                                                                            |
| data                          | the patient context                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| dataEndpoint                  | the patient context. Data should be used in place of data endpoint if specified.                                                                                                                                                                                                                                                                                                                                                                     |
| url                           | canonical of planDefinition or structureDefinition                                                                                                                                                                                                                                                                                                                                                                                                   |
| profile                       | structure definition resource                                                                                                                                                                                                                                                                                                                                                                                                                        |
| planDefinition                | plan definition resource                                                                                                                                                                                                                                                                                                                                                                                                                             |
