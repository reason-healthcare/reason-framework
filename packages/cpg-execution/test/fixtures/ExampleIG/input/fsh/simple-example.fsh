Instance: ApplicabilityLogic
InstanceOf: Library
* status = #draft
* type = http://terminology.hl7.org/CodeSystem/library-type#logic-library
* content.id = "ig-loader-applicability-logic.cql"

Instance: DrinkWaterRecommendation
InstanceOf: PlanDefinition
Usage: #definition
Title: "Simple Plan Definition"
Description: "Simple PlanDefinition to create a MedicationRequest to drink water if an Observation of 'thirsty' is found"
* library = Canonical(ApplicabilityLogic)
* status = #draft
* action[+]
  * textEquivalent = """
Recommend ordering water if patient is dehydrated
"""
  * condition
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "should have a glass of water"
  * definitionCanonical = Canonical(OrderWaterActivity)

Instance: OrderWaterActivity
InstanceOf: ActivityDefinition
Usage: #definition
* status = #draft
* kind = #MedicationRequest
* productCodeableConcept = http://snomed.info/sct#11713004

Instance: Patient1
InstanceOf: Patient
Usage: #example
* name
  * given = "Smith"

Instance: Observation1Patient1
InstanceOf: Observation
* status = #final
* subject = Reference(Patient1)
* code = http://snomed.info/sct#34095006

Instance: ExampleBundle
InstanceOf: Bundle
Usage: #example
Title: "ExampleBundle"
Description: "Example bundle with Observation and Patient inside"
* type = #collection
* entry[+]
  * resource = Patient1
* entry[+]
  * resource = Observation1Patient1
