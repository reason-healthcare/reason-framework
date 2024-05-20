import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import { useState } from 'react'
import { UpCircleFilled, DownCircleFilled } from '@ant-design/icons'

type InteractiveHandleProps = {
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  collapsed: boolean
  setExpandNode: React.Dispatch<React.SetStateAction<string>>
  id: string
}

const InteractiveHandle = ({
  setCollapsed,
  collapsed,
  setExpandNode,
  id,
}: InteractiveHandleProps) => {
  const [displayIcon, setDisplayIcon] = useState(false)

  const handleClick = () => {
    if (collapsed) {
      setExpandNode(id)
    }
    setCollapsed(!collapsed)
  }

  const onHover = () => {
    // Temp disable collapse on handle click
    if (collapsed) {
      setDisplayIcon(true)
    } else {
      setDisplayIcon(false)
    }
  }

  return (
    <div onMouseEnter={onHover} onMouseLeave={onHover}>
      {displayIcon && collapsed &&
        <DownCircleFilled className="collapse-icon" onClick={handleClick} />
      }
      <Handle
        className={displayIcon && collapsed ? 'hidden-handle' : ''}
        type="source"
        position={Position.Bottom}
      />
    </div>
  )
}

export default InteractiveHandle
