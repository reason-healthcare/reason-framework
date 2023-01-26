library ExampleLibrary version '0.1.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

valueset "Height": 'http://example.org/ValueSet/Height'
valueset "Weight": 'http://example.org/ValueSet/Weight' version '0.1.0'

valueset "Active Hypertension": 'https://cqlab.io/value-sets/232d9c20-612e-4b4c-b5f6-f401823c10d1' version 'Draft'
valueset "Antithrombotic Therapy": 'https://cqlab.io/value-sets/232d9c20-612e-4b4c-b5f6-f401823c10d1' version 'Draft'


codesystem "Condition": 'http://terminology.hl7.org/CodeSystem/condition-clinical'
code "activeStatus": 'active' from "ConditionClinicalStatusCodes"

context Patient

define "example message": 
  'hello message'

define "is false":
  false

define "is true":
  true


define "Qualified Hypertension":
  [Condition: "Active Hypertension"] Hypertension 
    where Hypertension.clinicalStatus ~ "activeStatus"

define "No Antithrombotic Therapy":
  not exists (
    ["MedicationAdministration": "Antithrombotic Therapy"] AntithromboticTherapy
      where AntithromboticTherapy.status = 'completed'
  )