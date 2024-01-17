Profile: WeightCaseFeature
Parent: Observation
* ^extension[+].url = "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression"
* ^extension[=].valueExpression.language = #text/cql-identifier
* ^extension[=].valueExpression.expression = "Body Weight"
* ^extension[=].valueExpression.reference = "http://example.org/Library/CHFLibrary"
* value[x] only Quantity
