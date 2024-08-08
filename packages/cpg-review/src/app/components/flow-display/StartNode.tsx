import { Handle, Position } from 'reactflow'
import { useEffect, useState } from 'react'
import '@/styles/node.css'
import { NodeProps } from '../../types/NodeProps'

const StartNode = ({ data: nodeProps, id }: NodeProps) => {
  const {
    selectedNode
  } = nodeProps
  const [highlight, setHighlight] = useState<boolean>(true)

  useEffect(() => {
    if (selectedNode != null) {
      setHighlight(false)
    }
  }, [selectedNode])

  return (
    <div className={`start-node ${highlight ? 'node-highlight' : 'node-unhighlight'}`}>
      <p>START</p>
      <Handle type="source" position={Position.Bottom} className='hidden-handle' />
    </div>
  )
}

export default StartNode
