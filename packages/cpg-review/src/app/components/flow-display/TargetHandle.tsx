import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import { useState } from 'react'
import { DownOutlined } from '@ant-design/icons'

type TargetHandleProps = {
}

const TargetHandle = ({
}: TargetHandleProps) => {
  return (
    <div>
      <Handle
        className="target-handle hidden-handle"
        type="target"
        position={Position.Top}
      >
        <DownOutlined style={{width: 15, color: 'var(--accentGray)'}}/>
      </Handle>
    </div>
  )
}

export default TargetHandle
