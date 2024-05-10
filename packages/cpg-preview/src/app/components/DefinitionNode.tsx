import { Handle, Position } from 'reactflow'
import { useState, useEffect } from 'react'
import '@/styles/node.css'
import InteractiveHandle from './InteractiveHandle'

type DefinitionNodeProps = {
  data: {
    id: string
    label: string
    handle: 'output' | 'input' | undefined
    details: fhir4.PlanDefinitionAction | fhir4.ActivityDefinition
    setCollapsed: React.Dispatch<React.SetStateAction<string[]>>
    collapsed: string[]
  }
  selected: boolean
}

const DefinitionNode = ({ data, selected }: DefinitionNodeProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const { id, label, handle, details, setCollapsed, collapsed } = data

  useEffect(() => {
    if (isCollapsed) {
      setCollapsed([...collapsed, id])
    } else {
      setCollapsed(collapsed.filter((c) => c !== id))
    }
  }, [isCollapsed])

  return (
    <div className={selected ? 'node-highlight' : 'node-unhighlight'}>
      {handle !== 'input' ? (
        <Handle type="target" position={Position.Top} />
      ) : null}
      <p>{label}</p>
      {handle !== 'output' ? (
        <InteractiveHandle
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      ) : null}
    </div>
  )
}

export default DefinitionNode
