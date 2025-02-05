import { Handle, Position } from 'reactflow'
import '@/styles/node.css'

type TargetHandleProps = {}

const ApplicabilityHandle = ({}: TargetHandleProps) => {
  return (
    <div>
      <Handle
        className="target-handle hidden-handle"
        type="target"
        position={Position.Top}
      >
        {/* TODO: temporary hack to extend edge */}
        <div
          style={{
            height: '15px',
            width: '1px',
            backgroundColor: 'var(--accentGray)',
            position: 'relative',
            left: '8px',
          }}
        ></div>
      </Handle>
    </div>
  )
}

export default ApplicabilityHandle
