Profile: BodyWeightChangeObservation
Parent: Observation
// * ^extension[+].url = "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression"
// * ^extension[=].valueExpression.language = #text/cql-identifier
// * ^extension[=].valueExpression.expression = "Body Weight Change"
// * ^extension[=].valueExpression.reference = "http://hl7.org/fhir/uv/cpg/Library/CHF"
// * . 0..*
//   * ^short = "CHF Body Weight Profile"
//   * ^definition = "This profile defines how to represent body weight change observations in FHIR using a CHF code and UCUM units of measure."
* code
  * ^short = "Body Weight Change"
  * ^definition = "Body Weight Change."
  * coding
    * ^slicing.discriminator[0].type = #value
    * ^slicing.discriminator[=].path = "code"
    * ^slicing.discriminator[+].type = #value
    * ^slicing.discriminator[=].path = "system"
    * ^slicing.ordered = false
    * ^slicing.rules = #open
  * coding contains BodyWeightCode 1..1
  * coding[BodyWeightCode]
    * system 1..1
    * system only uri
    * system = "http://hl7.org/fhir/uv/cpg/CodeSystem/chf-codes" (exactly)
    * code 1..1
    * code only code
    * code = #body-weight-change (exactly)
* valueQuantity
  * value 1..1 MS
  * value only decimal
  * unit 1..1 MS
  * unit only string
  * system 1..1 MS
  * system only uri
  * system = "http://unitsofmeasure.org" (exactly)
  * code 1..1
  * code only code
  * code = #kg/d (exactly)
    * ^short = "kg/d"
    * ^definition = "Kilograms per day"