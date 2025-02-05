RuleSet: DefinitionMetaData
* status = #active

Instance: RecommendationLogic
InstanceOf: CRMIComputableLibrary
* insert DefinitionMetaData
* type = #logic-library
* content.id = "ig-loader-RecommendationLogic.cql"

Instance: ExampleRecommendationDefinition
InstanceOf: CPGRecommendationDefinition
Usage: #Example
* insert DefinitionMetaData
* library = Canonical(RecommendationLogic)
* action[+]
  * condition
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "Over 18"
  * definitionCanonical = Canonical(ReportOver18)
  * selectionBehavior = #at-most-one
  * action[+]
    * definitionCanonical = Canonical(OrderMedication1)
  * action[+]
    * definitionCanonical = Canonical(OrderMedication2)
* action[+]
  * condition
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "Not over 18"
  * definitionCanonical = Canonical(ReportUnder18)
  * action[+]
    * selectionBehavior = #at-most-one
    * action[+]
      * title = "Recommend Medication 3"
      * definitionCanonical = Canonical(RecommendMedication3)
    * action[+]
      * title = "Order Medication 4"
      * definitionCanonical = Canonical(OrderMedication4)

Instance: ReportOver18
InstanceOf: CPGServiceRequestActivity
* insert DefinitionMetaData
* kind = #ServiceRequest
* intent = #proposal
* doNotPerform = false

Instance: ReportUnder18
InstanceOf: CPGServiceRequestActivity
* insert DefinitionMetaData
* kind = #ServiceRequest
* intent = #proposal
* doNotPerform = false

Instance: OrderMedication1
InstanceOf: CPGMedicationRequestActivity
* insert DefinitionMetaData
* kind = #MedicationRequest
* intent = #proposal
* doNotPerform = false

Instance: OrderMedication2
InstanceOf: CPGMedicationRequestActivity
* insert DefinitionMetaData
* kind = #MedicationRequest
* intent = #proposal
* doNotPerform = false

Instance: RecommendMedication3
InstanceOf: CPGRecommendationDefinition
* insert DefinitionMetaData
* action[+]
  * selectionBehavior = #all
  * action[+]
    * definitionCanonical = Canonical(PatientEducation)
  * action[+]
    * definitionCanonical = Canonical(OrderMedication3)

Instance: PatientEducation
InstanceOf: CPGComputablePlanDefinition
* insert DefinitionMetaData
* type = #order-set
* action[+]
  * selectionBehavior = #all
  * action[+]
    * definitionCanonical = Canonical(SendWrittenEducation)
  * action[+]
    * definitionCanonical = Canonical(ProvideVerbalEducation)

Instance: SendWrittenEducation
InstanceOf: CPGServiceRequestActivity
* insert DefinitionMetaData
* kind = #ServiceRequest
* intent = #proposal
* doNotPerform = false


Instance: ProvideVerbalEducation
InstanceOf: CPGServiceRequestActivity
* insert DefinitionMetaData
* kind = #ServiceRequest
* intent = #proposal
* doNotPerform = false

Instance: OrderMedication3
InstanceOf: CPGMedicationRequestActivity
* insert DefinitionMetaData
* kind = #MedicationRequest
* intent = #proposal
* doNotPerform = false

Instance: OrderMedication4
InstanceOf: CPGMedicationRequestActivity
* insert DefinitionMetaData
* kind = #MedicationRequest
* intent = #proposal
* doNotPerform = false
