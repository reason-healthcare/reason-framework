import { useState, useEffect } from 'react'
import Image from 'next/image'
import '@/styles/node.css'
import InteractiveHandle from './InteractiveHandle'
import { NodeProps } from '../../types/NodeProps'
import { Tooltip } from 'antd'
import { InfoCircleFilled } from '@ant-design/icons'
import ApplicabilityHandle from './ApplicabilityHandle'

const ApplicabilityNode = ({ data: nodeProps, id }: NodeProps) => {
  const {
    label,
    handle,
    nodeData,
    // isCollapsed,
    setNodeToExpand,
    selectedNode,
    setSelectedNode,
    setNodeData,
  } = nodeProps
  // const { nodeDetails, partOf } = nodeData
  const [collapsed, setCollapsed] = useState<boolean>(false)
  // const [highlight, setHighlight] = useState<boolean>()

  // useEffect(() => {
  //   // setCollapsed(isCollapsed)
  //   if (selectedNode === id) {
  //     setHighlight(true)
  //   } else {
  //     setHighlight(false)
  //   }
  // }, [selectedNode])

  const handleNodeClick = () => {
    setSelectedNode(id)
    setNodeData(nodeData)
  }

  return (
    <>
      <div className={`clickable node-container applicability`}>
        {handle?.includes('target') ? <ApplicabilityHandle /> : null}
        <div className="diamond-container" onClick={handleNodeClick}>
          <Image
            src={
              // highlight ? 'images/diamond-highlight.svg' : '/images/diamond.svg'
              '/images/diamond.svg'
            }
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
          <InteractiveHandle
            setCollapsed={setCollapsed}
            collapsed={collapsed}
            setNodeToExpand={setNodeToExpand}
            id={id}
          />
        )}
      </div>
      <div className="action-selection-label">{'Yes'}</div>
    </>
  )
}

export default ApplicabilityNode
