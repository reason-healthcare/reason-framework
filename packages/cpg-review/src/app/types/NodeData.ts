export interface NodeData {
  nodeDetails: fhir4.PlanDefinitionAction | fhir4.ActivityDefinition | fhir4.Questionnaire
  partOf: fhir4.PlanDefinition
}
