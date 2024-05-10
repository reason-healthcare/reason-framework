import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import { useState } from 'react'
import { UpCircleFilled, DownCircleFilled } from '@ant-design/icons'

type InteractiveHandleProps = {
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  isCollapsed: boolean
}

const InteractiveHandle = ({
  setIsCollapsed,
  isCollapsed,
}: InteractiveHandleProps) => {
  const [displayIcon, setDisplayIcon] = useState(false)

  const handleClick = () => {
    setIsCollapsed(!isCollapsed)
  }

  const onHover = () => {
    setDisplayIcon(!displayIcon)
  }

  return (
    <div onMouseEnter={onHover} onMouseLeave={onHover}>
      {displayIcon && !isCollapsed ? (
        <UpCircleFilled className="collapse-icon" onClick={handleClick} />
      ) : displayIcon && isCollapsed ? (
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
