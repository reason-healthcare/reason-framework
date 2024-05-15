import { Handle, Position } from 'reactflow'
import { useState, useEffect } from 'react'
import '@/styles/node.css'
import InteractiveHandle from './InteractiveHandle'

type DefinitionNodeProps = {
  data: {
    label: string
    handle: 'output' | 'input' | undefined
    details: fhir4.PlanDefinitionAction
    isCollapsed: boolean
    setExpandNode: React.Dispatch<React.SetStateAction<string>>
    selected: string | undefined
    setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
    setDetails: React.Dispatch<React.SetStateAction<fhir4.PlanDefinition | fhir4.PlanDefinitionAction | undefined>>
    setShowDetails: React.Dispatch<React.SetStateAction<boolean>>
  }
  id: string
}

const DefinitionNode = ({ data, id }: DefinitionNodeProps) => {
  const { label, handle, details, isCollapsed, setExpandNode, selected, setSelected, setDetails, setShowDetails } = data
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
    setDetails(details)
    setShowDetails(true)
  }

  return (
    <div className={highlight ? 'node-highlight' : 'node-unhighlight'}>
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
          setExpandNode={setExpandNode}
          id={id}
        />
      ) : null}
    </div>
  )
}

export default DefinitionNode
