import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import { useState } from 'react'
import { UpCircleFilled, DownCircleFilled, DownOutlined } from '@ant-design/icons'

type InteractiveHandleProps = {
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  collapsed: boolean
  setNodeToExpand: React.Dispatch<React.SetStateAction<string>>
  id: string
}

const InteractiveHandle = ({
  setCollapsed,
  collapsed,
  setNodeToExpand,
  id,
}: InteractiveHandleProps) => {

  const handleClick = () => {
    if (collapsed) {
      setNodeToExpand(id)
    }
    setCollapsed(!collapsed)
  }

  return (
    <div>
      <Handle
        className='hidden-handle'
        type="source"
        position={Position.Bottom}
      >
        {collapsed && <DownCircleFilled className="expand-icon" onClick={handleClick} />}
      </Handle>
    </div>
  )
}

export default InteractiveHandle
