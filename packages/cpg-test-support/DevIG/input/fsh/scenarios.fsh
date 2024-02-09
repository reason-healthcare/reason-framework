Instance: Patient1
InstanceOf: Patient
* name.given = "Over18"
* birthDate = "1970-01-01"

Instance: Patient2
InstanceOf: Patient
* name.given = "Under18"
* birthDate = "2024-01-01"

// Instance: Condition1
// InstanceOf: Condition
// * clinicalStatus = #active
// * subject = Reference(Pateient1)

// Instance: Condition2
// InstanceOf: Condition
// * clinicalStatus = #inactive
// * subject = Reference(Pateient2)

Instance: Patient1Scenario
InstanceOf: Bundle
* type = #collection
* entry[+]
  * fullUrl = "http://example.org/Patient/Patient1"
  * resource = Patient1
// * entry[+]
//   * fullUrl = "http://example.org/Condition/Condition1"
//   * resource = Condition1

Instance: Patient2Scenario
InstanceOf: Bundle
* type = #collection
* entry[+]
  * fullUrl = "http://example.org/Patient/Patient2"
  * resource = Patient2
// * entry[+]
//   * fullUrl = "http://example.org/Condition/Condition2"
//   * resource = Condition2
