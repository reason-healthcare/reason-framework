export interface NodeContent {
  resource:
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | fhir4.Questionnaire
  partOf?: fhir4.PlanDefinition
}

export interface NodeProps {
  data: {
    label: string
    handle: ('source' | 'target')[]
    nodeContent: NodeContent
    isCollapsed: boolean
    isSelected: boolean
    setNodeToExpand: React.Dispatch<React.SetStateAction<string>>
    setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  }
  id: string
}
