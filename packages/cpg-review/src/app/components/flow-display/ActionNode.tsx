import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import InteractiveHandle from './InteractiveHandle'
import { InfoCircleFilled } from '@ant-design/icons'
import { Tooltip } from 'antd'

type ActionNodeProps = {
  data: {
    label: string
    handle: 'output' | undefined
    json: fhir4.PlanDefinitionAction
    isCollapsed: boolean
    setexpandedNode: React.Dispatch<React.SetStateAction<string>>
    selected: string | undefined
    setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
    setJson: React.Dispatch<
      React.SetStateAction<
        fhir4.PlanDefinition | fhir4.PlanDefinitionAction | undefined
      >
    >
    setShowNarrative: React.Dispatch<React.SetStateAction<boolean>>
  }
  id: string
}

const ActionNode = ({ data, id }: ActionNodeProps) => {
  const {
    label,
    handle,
    json,
    isCollapsed,
    setexpandedNode,
    selected,
    setSelected,
    setJson,
    setShowNarrative,
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

  let jsonLabel
  if (json.selectionBehavior && !collapsed) {
    jsonLabel = (
      <div className="action-json-label">
        {`Select ${json.selectionBehavior}`}
      </div>
    )
  }

  const handleNodeClick = () => {
    setSelected(id)
    setJson(json)
    setShowNarrative(true)
  }

  return (
    <div className="node-container">
      <Handle type="target" position={Position.Top} style={{ zIndex: 100 }} />
      <div className="diamond-container" onClick={handleNodeClick}>
        <Image
          src={
            highlight ? 'images/diamond-highlight.svg' : '/images/diamond.svg'
          }
          alt="diamond node"
          className="diamond-icon"
          width="150"
          height="150"
        />
        <div className="text-outer-container">
          {label ? (
            <div className="text-inner-container">
              <p>{label}</p>
            </div>
          ) : (
            <Tooltip
              title="Missing identifier. Click for json."
              color="var(--drGray)"
            >
              <InfoCircleFilled width={50} className="info-icon" />
            </Tooltip>
          )}
        </div>
      </div>
      {handle !== 'output' ? (
        <InteractiveHandle
          setCollapsed={setCollapsed}
          collapsed={collapsed}
          setexpandedNode={setexpandedNode}
          id={id}
        />
      ) : null}
      {jsonLabel}
    </div>
  )
}

export default ActionNode
