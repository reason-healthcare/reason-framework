RuleSet: CanonicalMetadata(type, id)
* url = "http://example.org/{type}/{id}"
* version = "0.1.0"
* status = #draft

Instance: Patient123
InstanceOf: Patient
* name
  * given = "Sam"
  * family = "Smith"

Instance: Practitioner123
InstanceOf: Practitioner
* name
  * prefix = "Dr"
  * given = "Betta"
  * family = "Safe"

Instance: Encounter123
InstanceOf: Encounter
* status = #in-progress
* class = http://terminology.hl7.org/CodeSystem/v3-ActCode#AMB

Instance: ChildLibrary
InstanceOf: Library
* insert CanonicalMetadata(Library, ChildLibrary)
* type = http://terminology.hl7.org/CodeSystem/library-type#logic-library
* content.id = "ig-loader-ChildLibrary.cql"

Instance: ExampleLibrary
InstanceOf: Library
* insert CanonicalMetadata(Library, ExampleLibrary)
* type = http://terminology.hl7.org/CodeSystem/library-type#logic-library
* content.id = "ig-loader-ExampleLibrary.cql"

Instance: CommunicationRequestActivity
InstanceOf: ActivityDefinition
Usage: #definition
* insert CanonicalMetadata(ActivityDefinition, CommunicationRequestActivity)
* library = Canonical(ExampleLibrary)
* kind = #CommunicationRequest
* dynamicValue
  * path = "payload[0].contentString"
  * expression
    * language = #text/cql-identifier
    * expression = "example message"

Instance: EcaWithCommunicationAction
InstanceOf: PlanDefinition
* insert CanonicalMetadata(PlanDefinition, EcaWithCommunicationAction)
* type = http://terminology.hl7.org/CodeSystem/plan-definition-type#eca-rule
* action
  * id = "1"
  * definitionCanonical = Canonical(CommunicationRequestActivity)
  * dynamicValue
    * path = "priority"
    * expression
      * language = #text/fhirpath
      * expression = "'stat'"

Instance: EcaWithApplicabilitySimple1
InstanceOf: PlanDefinition
* insert CanonicalMetadata(PlanDefinition, EcaWithApplicability1)
* type = http://terminology.hl7.org/CodeSystem/plan-definition-type#eca-rule
* library = Canonical(ExampleLibrary)
* action
  * id = "1"
  * condition
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "is false"

Instance: EcaWithApplicabilitySimple2
InstanceOf: PlanDefinition
* insert CanonicalMetadata(PlanDefinition, EcaWithApplicability1)
* type = http://terminology.hl7.org/CodeSystem/plan-definition-type#eca-rule
* library = Canonical(ExampleLibrary)
* action
  * id = "1"
  * condition
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "is true"

Instance: EcaWithApplicabilityMulti1
InstanceOf: PlanDefinition
* insert CanonicalMetadata(PlanDefinition, EcaWithApplicabilityMulti1)
* type = http://terminology.hl7.org/CodeSystem/plan-definition-type#eca-rule
* library = Canonical(ExampleLibrary)
* title = "Example ECA Rule"
* description = "An example that will create a recommendation for a communication request."
* action
  * id = "1"
  * title = "Recommend a communication request"
  * description = "When a patient needs to be communicated to based on some logic."
  * priority = #routine
  * documentation
    * type = #documentation
    * label = "Some pubmed article"
    * url = "http://pubmed.org/some-article"
  * trigger
    * type = #named-event
    * name = "patient-view"
  * condition[+]
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "is true"
  * condition[+]
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "is true"
  * definitionCanonical = Canonical(CommunicationRequestActivity)

Instance: EcaWithApplicabilityMulti2
InstanceOf: PlanDefinition
* insert CanonicalMetadata(PlanDefinition, EcaWithApplicabilityMulti2)
* type = http://terminology.hl7.org/CodeSystem/plan-definition-type#eca-rule
* library = Canonical(ExampleLibrary)
* action
  * id = "1"
  * condition[+]
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "is true"
  * condition[+]
    * kind = #applicability
    * expression
      * language = #text/cql-identifier
      * expression = "is false"

Alias: $LOINC = http://loinc.org|2.73

ValueSet: Height
* $LOINC#8302-2 "Body height"
* $LOINC#8306-3 "Body height --lying"
* $LOINC#8308-9 "Body height --standing"
* $LOINC#3137-7 "Body height Measured"
* $LOINC#3138-5 "Body height Stated"

ValueSet: Weight
* $LOINC#29463-7 "Body weight"
* $LOINC#3141-9 "Body weight Measured"
* $LOINC#3142-7 "Body weight Stated"
* $LOINC#75292-3 "Body weight - Reported --usual"
* $LOINC#79348-9 "Body weight --used for drug calculation"
* $LOINC#8350-1 "Body weight Measured --with clothes"
* $LOINC#8351-9 "Body weight Measured --without clothes"