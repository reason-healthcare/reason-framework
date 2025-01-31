import Image from 'next/image'
import '@/styles/node.css'
import { NodeProps } from '../../types/NodeProps'
import { Tooltip } from 'antd'
import { InfoCircleFilled } from '@ant-design/icons'
import ApplicabilityHandle from './ApplicabilityHandle'
import { Handle, Position } from 'reactflow'

const ApplicabilityNode = ({ data: nodeProps, id }: NodeProps) => {
  const { label, handle, setSelectedNode } = nodeProps

  const handleNodeClick = () => {
    setSelectedNode(id.replace('condition-', ''))
  }

  return (
    <>
      <div className={`clickable node-container applicability`}>
        {handle?.includes('target') ? <ApplicabilityHandle /> : null}
        <div className="diamond-container" onClick={handleNodeClick}>
          <Image
            src={'/images/diamond.svg'}
            alt="diamond node"
            className="diamond-icon"
            width="150"
            height="150"
          />
          <div className="diamond-text-container">
            {label ? (
              <p>{label}</p>
            ) : (
              <Tooltip
                title="Missing identifier. Click for data."
                color="var(--drGray)"
              >
                <InfoCircleFilled width={50} className="info-icon" />
              </Tooltip>
            )}
          </div>
        </div>
        {handle?.includes('source') && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="hidden-handle"
          />
        )}
      </div>
      {handle?.includes('source') && (
        <div className="action-selection-label">{'Yes'}</div>
      )}
    </>
  )
}

export default ApplicabilityNode
