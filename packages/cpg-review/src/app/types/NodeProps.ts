import { NodeData } from './NodeData'

export interface NodeProps {
  data: {
    label: string
    handle: ('source' | 'target')[]
    nodeData: NodeData
    isCollapsed: boolean
    isSelected: boolean
    setNodeToExpand: React.Dispatch<React.SetStateAction<string>>
    setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  }
  id: string
}
