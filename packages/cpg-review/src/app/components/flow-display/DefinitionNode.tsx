import { Handle, Position } from 'reactflow'
import { useState, useEffect } from 'react'
import '@/styles/node.css'
import InteractiveHandle from './InteractiveHandle'

type DefinitionNodeProps = {
  data: {
    label: string
    handle: 'output' | 'input' | undefined
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

const DefinitionNode = ({ data, id }: DefinitionNodeProps) => {
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

  const handleNodeClick = () => {
    setSelected(id)
    setJson(json)
    setShowNarrative(true)
  }

  return (
    <div className={highlight ? 'node-highlight' : 'node-unhighlight'}>
      <div className="inner-container">
        {handle !== 'input' ? (
          <Handle type="target" position={Position.Top} />
        ) : null}
        <div onClick={handleNodeClick}>
          <p>{label}</p>
        </div>
        {handle !== 'output' ? (
          <InteractiveHandle
            setCollapsed={setCollapsed}
            collapsed={collapsed}
            setexpandedNode={setexpandedNode}
            id={id}
          />
        ) : null}
      </div>
    </div>
  )
}

export default DefinitionNode
