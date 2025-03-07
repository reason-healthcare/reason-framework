import { RequestResource } from 'helpers'

export interface NodeContent {
  resource:
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | fhir4.Questionnaire
    | fhir4.RequestGroup
    | RequestResource
  partOf?: fhir4.PlanDefinition | fhir4.RequestGroup
}

export interface NodeProps {
  data: {
    label: string
    handle: ('source' | 'target')[]
    nodeContent: NodeContent
    isExpandable: boolean
    isSelected: boolean
    inactive: boolean
    parentNodeId?: string
    setNodeToExpand: React.Dispatch<React.SetStateAction<string>>
    setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  }
  id: string
}
