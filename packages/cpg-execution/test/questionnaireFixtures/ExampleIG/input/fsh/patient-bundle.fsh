Instance: Patient1
InstanceOf: Patient
Usage: #inline
* name
  * given = "Sarah"

Instance: BodyWeight1
InstanceOf: bodyweight
Usage: #inline
* status = #final
* code = http://loinc.org#29463-7
* valueQuantity
  * value = 70.0
  * unit = "kg"
  * system =  "http://unitsofmeasure.org"
  * code = #kg
* subject = Reference(Patient/Patient1)
* effectiveDateTime = "2023-08-31"

Instance: Height1
InstanceOf: Observation
* status = #final
* code = http://loinc.org#8302-2
* valueString.value =  "165 inches"
* subject = Reference(Patient/Patient1)

Instance: PatientTestBundle1
InstanceOf: Bundle
* type = #collection
* entry[+].resource = Patient1
* entry[+].resource = BodyWeight1
* entry[+].resource = Height1