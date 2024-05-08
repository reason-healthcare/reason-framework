import { Handle, Position } from 'reactflow'
import { useState, useEffect } from 'react'
import '@/styles/node.css'
import diamond from '../../../public/images/diamond.svg'
import diamondHighlight from '../../../public/images/diamond-highlight.svg'
import Image from 'next/image'

type ActionNodeProps = {
  data: {
    id: string
    label: string
    handle: 'output' | 'input' | undefined
    details: fhir4.PlanDefinitionAction
    setCollapsed: React.Dispatch<React.SetStateAction<string[]>>
    collapsed: string[]
  }
  selected: boolean
}

const DefinitionNode = ({data, selected}: ActionNodeProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const { id, label, handle, details, setCollapsed, collapsed } = data

  useEffect(() => {
    if (isCollapsed) {
      setCollapsed([...collapsed, id])
    } else {
      setCollapsed(collapsed.filter(c => c !== id))
    }
  }, [isCollapsed])

  const handleClick = () => {
    console.log('test')
    setIsCollapsed(!isCollapsed)
  }
  return (
    <div className={selected ? "node-highlight" : "node-unhighlight"}>
      {handle !== 'input' ? (
        <Handle type="target" position={Position.Top} />
      ) : null}
      <p>{label}</p>
      {handle !== 'output' ? (
        <Handle type="source" position={Position.Bottom} onClick={handleClick} />
      ) : null}
    </div>
  )
}

export default DefinitionNode