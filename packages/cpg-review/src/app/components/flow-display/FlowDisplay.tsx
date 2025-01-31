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
  NodeTypes,
} from 'reactflow'
import Flow from '../../graph/Flow'
import ContentNode from './ContentNode'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import BrowserResolver from 'resolver/browser'
import StartNode from './StartNode'
import { NodeContent } from '../../types/NodeProps'
import ApplicabilityNode from './ApplicabilityNode'

interface FlowDisplayProps {
  resolver: BrowserResolver | undefined
  planDefinition: fhir4.PlanDefinition
  setNarrativeContent: React.Dispatch<React.SetStateAction<NodeContent | undefined>>
  selectedNode: string | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setNarrativeContent,
  selectedNode,
  setSelectedNode,
}: FlowDisplayProps) {
  const [flow, setFlow] = useState<Flow | undefined>()
  const [visibleNodes, setVisibleNodes] = useState<Node[] | undefined>()
  const [visibleEdges, setVisibleEdges] = useState<Edge[] | undefined>()
  const [expandedView, setExpandedView] = useState<boolean>(true)
  const [nodeToExpand, setNodeToExpand] = useState<string>()
  // Changing key triggers re-render of ReactFlow component
  const [key, setKey] = useState<number>(0)

  const nodeTypes = useMemo(
    () => ({
      contentNode: ContentNode,
      startNode: StartNode,
      applicabilityNode: ApplicabilityNode,
    }),
    []
  ) as NodeTypes

  useEffect(() => {
    const flow = new Flow()
    if (resolver && resolver.resourcesByCanonical) {
      flow.generateInitialFlow(planDefinition, resolver)
      flow.positionNodes({
        setNodeToExpand,
        setSelectedNode,
      }).then((f) => {
        setFlow(f)
        setVisibleNodes(f.nodes)
        setVisibleEdges(f.edges)
      })
    }
  }, [])

  useEffect(() => {
    const newFlow = new Flow(flow?.nodes, flow?.edges)
    if (!expandedView) {
      newFlow?.collapseAllNodes().then(() => {
        setVisibleNodes(newFlow.nodes)
        setVisibleEdges(newFlow.edges)
        const newKey = key + 1
        setKey(newKey)
      })
    } else if (expandedView) {
      setVisibleNodes(newFlow.nodes)
      setVisibleEdges(newFlow.edges)
      const newKey = key + 1
      setKey(newKey)
    }
  }, [expandedView])

  useEffect(() => {
    if (selectedNode && visibleNodes) {
      setVisibleNodes(
        visibleNodes.map((node) => {
          return {
            ...node,
            data: { ...node.data, isSelected: node.id === selectedNode },
          }
        })
      )
      const selectedNodeContent = visibleNodes.find((n) => n.id === selectedNode)?.data.nodeContent
      setNarrativeContent(selectedNodeContent)
    } else if (visibleNodes != null) {
      setVisibleNodes(
        visibleNodes.map((node) => {
          return {
            ...node,
            data: { ...node.data, isSelected: false},
          }
        })
      )
    }
  }, [selectedNode])

  const reactFlow = useReactFlow()
  useEffect(() => {
    const flow = new Flow(visibleNodes, visibleEdges)
    if (nodeToExpand != null) {
      const sourceNode = flow?.nodes?.find((n) => n.id === nodeToExpand)
      flow
        .expandChildren(sourceNode, flow?.nodes, flow?.edges)
        .then((f) => {
          setVisibleNodes(f.nodes)
          setVisibleEdges(f.edges)
          sourceNode != null && selectedNode != null
            ? setSelectedNode(sourceNode.id)
            : null
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
        nodes={visibleNodes}
        edges={visibleEdges}
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
