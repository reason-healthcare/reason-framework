import { Handle, NodeProps, Node, Position } from 'reactflow'
import '@/styles/node.css'
import diamond from '../../../public/images/diamond.svg'
import Image from 'next/image'

type NodeData = {
  label: string
  handle: 'input' | 'output'
}
const ActionNode = ({ data }: NodeProps<NodeData>) => {
  const { label, handle } = data

  let outputHandle
  if (handle === 'output') {
    outputHandle = <Handle type="source" position={Position.Bottom} />
  }

  return (
    <div className="node-container">
      <Handle type="target" position={Position.Top} />
      <div className="diamond">
        <Image src={diamond} alt="diamond node" className="icon" />
        <div className="text-outer-container">
          <div className='text-inner-container'>
            <p>{label}</p>
          </div>
        </div>
      </div>
      {outputHandle}
    </div>
  )
}

export default ActionNode

