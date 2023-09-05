Instance: Patient1
InstanceOf: Patient
Usage: #inline
* name
  * given = "Alice"

Instance: BodyWeight1
InstanceOf: Observation
Usage: #inline
* status = #final
* code = http://loinc.org#29463-7
* valueQuantity.value = 70.0

Instance: PatientTestBundle1
InstanceOf: Bundle
* type = #collection
* entry[+].resource = Patient1