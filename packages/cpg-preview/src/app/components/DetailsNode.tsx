import { Handle, NodeProps, Position } from 'reactflow'
import '@/styles/detailsNode.css'

type NodeData = {
  label: string
}
const DetailsNode = ({ data }: NodeProps<NodeData>) => {
  const { label } = data

  return (
    <div className="details-node-container">
      <Handle className="handle" type="target" position={Position.Top} />
      <div>
        <label>{label}</label>
      </div>
      <Handle className="handle" type="source" position={Position.Bottom} />
    </div>
  )
}

export default DetailsNode
