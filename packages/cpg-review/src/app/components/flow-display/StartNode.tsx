import { Handle, Position } from 'reactflow'
import { useState } from 'react'
import '@/styles/node.css'
import { NodeProps } from '../../types/NodeProps'

const StartNode = ({ data: nodeProps, id }: NodeProps) => {
  const {
    label,
    handle,
    nodeData,
    isCollapsed,
    setNodeToExpand,
    selectedNode,
    setSelectedNode,
    setNodeData,

  } = nodeProps
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const [highlight, setHighlight] = useState<boolean>()

  return (
    <div className={highlight ? 'node-highlight' : 'node-unhighlight'} style={{borderRadius: '50%'}}>
      <p>Start</p>
      <Handle type="source" position={Position.Bottom} className='hidden-handle' />
    </div>
  )
}

export default StartNode
