import { Handle, Position } from 'reactflow'
import '@/styles/node.css'
import { DownCircleFilled } from '@ant-design/icons'

type InteractiveHandleProps = {
  isExpandable: boolean
  setNodeToExpand: React.Dispatch<React.SetStateAction<string>>
  id: string
}

const InteractiveHandle = ({
  isExpandable,
  setNodeToExpand,
  id,
}: InteractiveHandleProps) => {
  const handleClick = () => {
    if (isExpandable) {
      setNodeToExpand(id)
    }
  }

  return (
    <div>
      <Handle
        className="hidden-handle"
        type="source"
        position={Position.Bottom}
      >
        {isExpandable && (
          <DownCircleFilled className="expand-icon" onClick={handleClick} />
        )}
      </Handle>
    </div>
  )
}

export default InteractiveHandle
