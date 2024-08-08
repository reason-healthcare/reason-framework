'use client'
import { useState, useEffect, useMemo } from 'react'
import ReactFlow, {
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
  ControlButton,
  useReactFlow,
} from 'reactflow'
import Flow from '../../graph/Flow'
import ContentNode from './ContentNode'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import BrowserResolver from 'resolver/browser'
import StartNode from './StartNode'
import { NodeData } from '../../types/NodeData'


interface FlowDisplayProps {
  resolver: BrowserResolver | undefined
  planDefinition: fhir4.PlanDefinition
  setNodeData: React.Dispatch<
    React.SetStateAction<
      | NodeData
      | undefined
    >
  >
  selectedNode: string | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setNodeData,
  selectedNode,
  setSelectedNode,
}: FlowDisplayProps) {
  const [expandedFlow, setExpandedFlow] = useState<Flow | undefined>()
  const [displayNodes, setDisplayNodes] = useState<Node[] | undefined>()
  const [displayEdges, setDisplayEdges] = useState<Edge[] | undefined>()
  const [expandedView, setExpandedView] = useState<boolean>(true)
  const [nodeToExpand, setNodeToExpand] = useState<string>()
  // Changing key triggers re-render of ReactFlow component
  const [key, setKey] = useState<number>(0)

  const nodeTypes = useMemo(
    () => ({ contentNode: ContentNode, startNode: StartNode }),
    []
  )

  const data = {
    nodeToExpand,
    setNodeToExpand,
    selectedNode,
    setSelectedNode,
    setNodeData,
  }
  const reactFlow = useReactFlow()

  useEffect(() => {
    const flow = new Flow()
    if (resolver && resolver.resourcesByCanonical) {
      flow.generateInitialFlow(planDefinition, resolver)
      flow.generateFinalFlow(data).then((f) => {
        setExpandedFlow(f)
        setDisplayNodes(f.nodes)
        setDisplayEdges(f.edges)
      })
    }
  }, [])

  useEffect(() => {
    const newFlow = new Flow(expandedFlow?.nodes, expandedFlow?.edges)
    if (!expandedView && planDefinition.id != null) {
      newFlow?.collapseAllFromSource(planDefinition.id, reactFlow).then(() => {
        setDisplayNodes(newFlow.nodes)
        setDisplayEdges(newFlow.edges)
        const newKey = key + 1
        setKey(newKey)
      })
    } else if (expandedView) {
      setDisplayNodes(newFlow.nodes)
      setDisplayEdges(newFlow.edges)
      const newKey = key + 1
      setKey(newKey)
    }
  }, [expandedView])

  useEffect(() => {
    if (selectedNode && displayNodes) {
      setDisplayNodes(
        displayNodes.map((node) => {
          return {
            ...node,
            data: { ...node.data, ...data },
          }
        })
      )
      const selectedNodeNode = displayNodes.find((n) => n.id === selectedNode)
      setNodeData(selectedNodeNode?.data.nodeData)
    }
  }, [selectedNode])

  useEffect(() => {
    const flow = new Flow(displayNodes, displayEdges)
    if (nodeToExpand) {
      const sourceNode = expandedFlow?.nodes?.find((n) => n.id === nodeToExpand)
      flow
        .expandChildren(sourceNode, expandedFlow?.nodes, expandedFlow?.edges)
        .then((f) => {
          setDisplayNodes(f.nodes)
          setDisplayEdges(f.edges)
          sourceNode ? setSelectedNode(sourceNode.id) : null
          flow.centerOnNode(nodeToExpand, 60, 1, reactFlow)
        })
    }
  }, [nodeToExpand])

  useEffect(() => {
    const newKey = key + 1
    setKey(newKey)
  }, [])

  const handleExpandedViewClick = () => {
    setExpandedView(!expandedView)
    setSelectedNode(undefined)
    setNodeToExpand(undefined)
  }

  const nodeColor = (node: Node) => {
    switch (node.type) {
      case 'contentNode':
        return 'var(--teal)'
      case 'Node':
        return 'var(--ltTeal)'
      default:
        return 'var(--blueGray)'
    }
  }

  return (
    <div className="flow-container">
      <ReactFlow
        key={key}
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        fitView={true}
        elevateEdgesOnSelect={true}
      >
        <Background color="#fafafa" />
        <MiniMap
          pannable
          zoomable
          position="bottom-left"
          nodeColor={nodeColor}
        />
        <Controls showInteractive={false} position="bottom-right">
          <ControlButton onClick={handleExpandedViewClick}>
            {expandedView ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  )
}
