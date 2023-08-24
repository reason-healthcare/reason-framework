RuleSet: QuestionnaireMetaData(id)
* url = "http://questionnaire-processor/Questionnaire/{id}"
* status = #draft

RuleSet: QuestionnaireItemMeta(id, path)
* linkId = "Observation.{path}"
* definition = "http//example.org/StructureDefinition/{id}#{path}"