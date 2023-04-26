library ApplicabilityLogic version '0.1.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1'

codesystem "SNOMED": 'http://snomed.info/sct'
code "Dehydration Code": '34095006' from "SNOMED"

// You can also make a valueset...
// valueset "Dehydration Codes": 'http://canonical/ValueSet'

context Patient

define "should have a glass of water":
  exists([Observation: "Dehydration Code"])
