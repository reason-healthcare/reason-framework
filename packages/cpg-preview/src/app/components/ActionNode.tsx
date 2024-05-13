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
    collapsed: string[],
    isCollapsed: boolean
  }
  selected: boolean
}

const ActionNode = ({ data, selected }: ActionNodeProps) => {
  const { id, label, handle, details, isCollapsed } = data
  const [collapsed, setCollapsed] = useState<boolean>(isCollapsed)

  // useEffect(() => {
  //   if (isCollapsed) {
  //     console.log('here from action')
  //     setCollapsed([...collapsed, id])
  //   } else {
  //     setCollapsed(collapsed?.filter((c) => c !== id))
  //   }
  // }, [isCollapsed])

  console.log(isCollapsed)

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
          setIsCollapsed={setCollapsed}
          isCollapsed={collapsed}
        />
      ) : null}
      {detailsLabel}
    </div>
  )
}

export default ActionNode
