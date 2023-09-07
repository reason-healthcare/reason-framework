library CHFLibrary version '0.1.0'

using FHIR version '4.0.1'

include FHIRHelpers version '0.1.0'

context Patient

define "Patient id":
  Patient.id

define "Body Weight Observation":
  First([Observation]).value

define "Body Weight":
  "Body Weight Observation".value.value


