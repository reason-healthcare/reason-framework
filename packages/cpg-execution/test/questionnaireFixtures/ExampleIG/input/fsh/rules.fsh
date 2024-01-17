RuleSet: QuestionnaireMetaData(id)
* url = "http://questionnaire-processor/Questionnaire/{id}"
* status = #draft

RuleSet: QuestionnaireItemMeta(id, path)
* linkId = "{path}"
* definition = "http://example.org/StructureDefinition/{id}#{path}"

RuleSet: KnowledgeArtifactDefinitionMetadata(id, type)
* url = "http://example.org/{type}/{id}"
* name = "{id}"
* title = "{type} {id}"
* status = #draft
* experimental = true
* publisher = "Example"
* jurisdiction = http://unstats.un.org/unsd/methods/m49/m49.htm#001 "World"
* version = "0.1.0"
* status = #draft
* extension
  * url = "http://hl7.org/fhir/StructureDefinition/cqf-knowledgeCapability"
  * valueCode = #shareable
* extension
  * url = "http://hl7.org/fhir/StructureDefinition/cqf-knowledgeCapability"
  * valueCode = #computable
* extension
  * url = "http://hl7.org/fhir/StructureDefinition/cqf-knowledgeCapability"
  * valueCode = #publishable
* extension
  * url = "http://hl7.org/fhir/StructureDefinition/cqf-knowledgeRepresentationLev"
  * valueCode = #structured