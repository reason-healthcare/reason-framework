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
  * selectionBehavior = #at-most-one
  * action[+]
    * definitionCanonical = Canonical(OrderMedication3)
  * action[+]
    * definitionCanonical = Canonical(OrderMedication4)
// * action[+]
  // * condition
  //   * kind = #applicability
  //   * expression
  //     * language = #text/cql-identifier
  //     * expression = "Should select treatment"
  // * selectionBehavior = #at-most-one
  // * action[+]
  //   * definitionCanonical = Canonical(OrderMedication1)
  // * action[+]
  //   * definitionCanonical = Canonical(OrderMedication2)

Instance: ReportOver18
InstanceOf: CPGGenerateReportActivity
* insert DefinitionMetaData
* kind = #Task
* intent = #proposal
* doNotPerform = false

Instance: ReportUnder18
InstanceOf: CPGGenerateReportActivity
* insert DefinitionMetaData
* kind = #Task
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
