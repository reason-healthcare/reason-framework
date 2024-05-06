import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import diamond from '../../../public/images/diamond.svg'
import diamondHighlight from '../../../public/images/diamond-highlight.svg'
import Image from 'next/image'

type ActionNodeProps = {
  data: {
    label: string
    handle: 'output' | undefined
    details: fhir4.PlanDefinitionAction
  }
  selected: boolean
}


const ActionNode = ({data, selected}: ActionNodeProps) => {
  const { label, handle, details } = data
  return (
    <div className="node-container">
      <Handle type="target" position={Position.Top} />
      <div className="diamond-container">
        <Image src={ selected ? diamondHighlight : diamond} alt="diamond node" className="diamond-icon" />
        <div className="text-outer-container">
          <div className="text-inner-container">
            <p>{label}</p>
          </div>
        </div>
      </div>
      {handle !== 'output' ? (
        <Handle type="source" position={Position.Bottom} />
      ) : null}
      <div className='action-details-label'>
       {details.selectionBehavior ? `Select ${details.selectionBehavior}` : null}
      </div>
    </div>
  )
}

export default ActionNode
