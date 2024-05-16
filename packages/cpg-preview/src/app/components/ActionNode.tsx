import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import diamond from '../../../public/images/diamond.svg'
import diamondHighlight from '../../../public/images/diamond-highlight.svg'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import InteractiveHandle from './InteractiveHandle'

type ActionNodeProps = {
  data: {
    label: string
    handle: 'output' | undefined
    details: fhir4.PlanDefinitionAction
    isCollapsed: boolean
    setExpandNode: React.Dispatch<React.SetStateAction<string>>
    selected: string | undefined
    setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
    setDetails: React.Dispatch<
      React.SetStateAction<
        fhir4.PlanDefinition | fhir4.PlanDefinitionAction | undefined
      >
    >
    setShowDetails: React.Dispatch<React.SetStateAction<boolean>>
  }
  id: string
}

const ActionNode = ({ data, id }: ActionNodeProps) => {
  const {
    label,
    handle,
    details,
    isCollapsed,
    setExpandNode,
    selected,
    setSelected,
    setDetails,
    setShowDetails,
  } = data
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const [highlight, setHighlight] = useState<boolean>()

  useEffect(() => {
    setCollapsed(isCollapsed)
    if (selected === id) {
      setHighlight(true)
    } else {
      setHighlight(false)
    }
  }, [isCollapsed, selected])

  let detailsLabel
  if (details.selectionBehavior && !collapsed) {
    detailsLabel = (
      <div className="action-details-label">
        {`Select ${details.selectionBehavior}`}
      </div>
    )
  }

  const handleNodeClick = () => {
    setSelected(id)
    setDetails(details)
    setShowDetails(true)
  }

  return (
    <div className="node-container">
      <Handle type="target" position={Position.Top} />
      <div className="diamond-container" onClick={handleNodeClick}>
        <Image
          src={highlight ? diamondHighlight : diamond}
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
          setCollapsed={setCollapsed}
          collapsed={collapsed}
          setExpandNode={setExpandNode}
          id={id}
        />
      ) : null}
      {detailsLabel}
    </div>
  )
}

export default ActionNode
