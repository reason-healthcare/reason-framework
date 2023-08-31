Instance: BodyWeightChangeExpected
InstanceOf: Questionnaire
Usage: #example
* description = "Questionnaire generated from http://example.org/StructureDefinition/CaseFeatureExpression"
* status = #draft
* url = "http://questionnaire-processor/Questionnaire/539f80ad-28a6-490c-aa34-78bb23e69432"
* item
  * linkId = "2ef59863-abcc-4199-92aa-29ba0348b523"
  * definition = "http://example.org/StructureDefinition/CaseFeatureExpression#Observation"
  * text = "Measurements and simple assertions"
  * type = #group
  * item[0]
    * linkId = "2c1c5c22-1463-47b8-8976-a0f0e18b61df"
    * definition = "http://example.org/StructureDefinition/CaseFeatureExpression#Observation.code"
    * text = "Body Weight Change"
    * required = true
    * type = #open-choice
    * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-codes"
    * item[+]
      * linkId = "Observation.code.coding"
      * type = #choice
      * text = "Code defined by a terminology system"
      * required = true
      * repeats = true
    * item[+]
      * linkId = "Observation.code.coding:BodyWeightCode"
      * type = #choice
      * text = "Code defined by a terminology system"
      * required = true
      * initial.valueCoding = http://hl7.org/fhir/uv/cpg/CodeSystem/chf-codes#body-weight-change
  * item[+]
    * linkId = "00fd6a05-69e3-487d-9ef7-5b813cb40e0e"
    * definition = "http://example.org/StructureDefinition/CaseFeatureExpression#Observation.valueQuantity"
    * text = "Actual result"
    * type = #quantity
  * item[+]
    * linkId = "a7a13c36-8c0c-4746-acf9-1c50e8c670e0"
    * definition = "http://example.org/StructureDefinition/CaseFeatureExpression#Observation.status"
    * text = "registered | preliminary | final | amended +"
    * required = true
    * type = #choice
    * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-status"