import { NodeData } from './NodeData'

export interface NodeProps {
  data: {
    label: string
    handle: ('source' | 'target')[]
    nodeData: NodeData
    isCollapsed: boolean
    setNodeToExpand: React.Dispatch<React.SetStateAction<string>>
    selectedNode: string | undefined
    setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
    setNodeData: React.Dispatch<React.SetStateAction<NodeData | undefined>>
  }
  id: string
}
