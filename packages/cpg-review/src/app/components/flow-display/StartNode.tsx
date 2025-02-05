import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import { NodeProps } from '../../types/NodeProps'

const StartNode = ({ data: nodeProps, id }: NodeProps) => {
  return (
    <div className={`start-node-container ${'node-highlight'}`}>
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
