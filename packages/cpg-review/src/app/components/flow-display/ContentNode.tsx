import { Handle, Position } from 'reactflow'
import { useState, useEffect } from 'react'
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
    nodeData,
    isCollapsed,
    setNodeToExpand,
    selectedNode,
    setSelectedNode,
    setNodeData,
  } = nodeProps
  const { nodeDetails, partOf } = nodeData
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const [highlight, setHighlight] = useState<boolean>()

  useEffect(() => {
    setCollapsed(isCollapsed)
    if (selectedNode === id) {
      setHighlight(true)
    } else {
      setHighlight(false)
    }
  }, [isCollapsed, selectedNode])

  let selectionDetail
  if (
    !is.ActivityDefinition(nodeDetails) &&
    !is.Questionnaire(nodeDetails) &&
    nodeDetails.selectionBehavior &&
    !collapsed
  ) {
    selectionDetail = (
      <div className="action-selection-label">
        {`Select ${nodeDetails.selectionBehavior}`}
      </div>
    )
  }

  const handleNodeClick = () => {
    setSelectedNode(id)
    setNodeData(nodeData)
  }

  return (
    <>
      <div
        className={`clickable node-container ${
          highlight ? 'node-highlight' : 'node-unhighlight'
        } ${
          is.ActivityDefinition(nodeDetails) || is.Questionnaire(nodeDetails)
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
            setCollapsed={setCollapsed}
            collapsed={collapsed}
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
