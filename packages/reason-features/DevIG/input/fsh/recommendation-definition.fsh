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
  * definitionCanonical = Canonical(CommunicateOver18)
* action[+]
  * condition
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "Not over 18"
  * definitionCanonical = Canonical(CommunicateUnder18)

Instance: CommunicateOver18
InstanceOf: CPGCommunicationActivity
* insert DefinitionMetaData
* kind = #CommunicationRequest
* intent = #proposal
* doNotPerform = false

Instance: CommunicateUnder18
InstanceOf: CPGCommunicationActivity
* insert DefinitionMetaData
* kind = #CommunicationRequest
* intent = #proposal
* doNotPerform = false
