import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import diamond from '../../../public/images/diamond.svg'
import diamondHighlight from '../../../public/images/diamond-highlight.svg'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import InteractiveHandle from './InteractiveHandle'

type ActionNodeProps = {
  data: {
    id: string
    label: string
    handle: 'output' | undefined
    details: fhir4.PlanDefinitionAction
    setCollapsed: React.Dispatch<React.SetStateAction<string[]>>
    collapsed: string[]
  }
  selected: boolean
}

const ActionNode = ({ data, selected }: ActionNodeProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const { id, label, handle, details, setCollapsed, collapsed } = data

  useEffect(() => {
    if (isCollapsed) {
      console.log(collapsed + 'collased')
      setCollapsed([...collapsed, id])
    } else {
      console.log(collapsed.filter((c) => c !== id) + 'filter')
      setCollapsed(collapsed.filter((c) => c !== id))
    }
  }, [isCollapsed])

  let detailsLabel
  if (details.selectionBehavior) {
    detailsLabel = (
      <div className="action-details-label">
        {`Select ${details.selectionBehavior}`}
      </div>
    )
  }

  return (
    <div className="node-container">
      <Handle type="target" position={Position.Top} />
      <div className="diamond-container">
        <Image
          src={selected ? diamondHighlight : diamond}
          alt="diamond node"
          className="diamond-icon"
        />
        <div className="text-outer-container">
          <div className="text-inner-container">
            <p>{label}</p>
          </div>
        </div>
      </div>
      {handle !== 'output' ? (
        <InteractiveHandle
          setIsCollapsed={setIsCollapsed}
          isCollapsed={isCollapsed}
        />
      ) : null}
      {detailsLabel}
    </div>
  )
}

export default ActionNode
