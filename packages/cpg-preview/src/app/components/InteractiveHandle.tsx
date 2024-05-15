import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import { useState } from 'react'
import { UpCircleFilled, DownCircleFilled } from '@ant-design/icons'
import { useEffect } from 'react'

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
    setDisplayIcon(!displayIcon)
  }

  return (
    <div onMouseEnter={onHover} onMouseLeave={onHover}>
      {displayIcon && !collapsed ? (
        <UpCircleFilled className="collapse-icon" onClick={handleClick} />
      ) : displayIcon && collapsed ? (
        <DownCircleFilled className="collapse-icon" onClick={handleClick} />
      ) : null}
      <Handle
        className={displayIcon ? 'hidden-handle' : ''}
        type="source"
        position={Position.Bottom}
      />
    </div>
  )
}

export default InteractiveHandle
