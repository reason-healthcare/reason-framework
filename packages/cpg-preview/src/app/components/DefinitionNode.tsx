import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import diamond from '../../../public/images/diamond.svg'
import diamondHighlight from '../../../public/images/diamond-highlight.svg'
import Image from 'next/image'

type ActionNodeProps = {
  data: {
    label: string
    handle: 'output' | 'input' | undefined
    details: fhir4.PlanDefinitionAction
  }
  selected: boolean
}

const DefinitionNode = ({data, selected}: ActionNodeProps) => {
  const { label, handle, details } = data
  return (
    <div className={selected ? "node-highlight" : "node-unhighlight"}>
      {handle !== 'input' ? (
        <Handle type="target" position={Position.Top} />
      ) : null}
      <p>{label}</p>
      {handle !== 'output' ? (
        <Handle type="source" position={Position.Bottom} />
      ) : null}
    </div>
  )
}

export default DefinitionNode