import { Handle, Position } from 'reactflow'
import { useEffect, useState } from 'react'
import '@/styles/node.css'
import { NodeProps } from '../../types/NodeProps'

const StartNode = ({ data: nodeProps, id }: NodeProps) => {
  const { isSelected } = nodeProps

  return (
    <div
      className={`start-node-container ${
        // isSelected ? 'node-highlight' : 'node-unhighlight'
        'node-highlight'
      }`}
    >
      <p>START</p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="hidden-handle"
      />
    </div>
  )
}

export default StartNode
