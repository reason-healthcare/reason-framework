import '@/styles/node.css'
import InteractiveHandle from './InteractiveHandle'
import { is } from 'helpers'
import { NodeProps } from '../../types/NodeProps'
import { Tooltip } from 'antd'
import { InfoCircleFilled } from '@ant-design/icons'
import TargetHandle from './TargetHandle'

const ContentNode = ({ data: nodeProps, id }: NodeProps) => {
  const {
    label,
    handle,
    nodeContent,
    isExpandable,
    isSelected,
    setNodeToExpand,
    setSelectedNode,
    inactive,
  } = nodeProps
  const { resource } = nodeContent

  let selectionDetail
  if (
    !is.ActivityDefinition(resource) &&
    !is.Questionnaire(resource) &&
    !is.RequestResource(resource) &&
    resource.selectionBehavior &&
    !isExpandable
  ) {
    selectionDetail = (
      <div className="action-selection-label">
        {`Select ${resource.selectionBehavior}`}
      </div>
    )
  }

  const handleNodeClick = () => {
    setSelectedNode(id)
  }

  return (
    <>
      <div
        className={`clickable node-container ${inactive ? 'opacity' : ''} ${
          isSelected ? 'node-highlight' : 'node-unhighlight'
        } ${
          is.ActivityDefinition(resource) ||
          is.Questionnaire(resource) ||
          is.RequestResource(resource)
            ? 'activity-node'
            : ''
        }`}
      >
        {handle?.includes('target') ? <TargetHandle /> : null}
        <div onClick={handleNodeClick}>
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
        {handle?.includes('source') && (
          <InteractiveHandle
            isExpandable={isExpandable}
            setNodeToExpand={setNodeToExpand}
            id={id}
          />
        )}
      </div>
      {selectionDetail}
    </>
  )
}

export default ContentNode
