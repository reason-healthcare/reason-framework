import { Handle, NodeProps, Position } from 'reactflow'
import '@/styles/node.css'
import diamond from '../../../public/images/diamond.svg'
import Image from 'next/image'

type NodeData = {
  label: string
  handle: 'output' | undefined
}
const ActionNode = ({ data }: NodeProps<NodeData>) => {
  const { label, handle } = data
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
      {handle !== 'output' ? <Handle type="source" position={Position.Bottom} /> : null}
    </div>
  )
}

export default ActionNode

