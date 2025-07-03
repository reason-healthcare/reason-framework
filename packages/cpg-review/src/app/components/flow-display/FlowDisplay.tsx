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
import { Button } from 'antd'
import { SidePanelView } from 'page'

interface FlowDisplayProps {
  resolver: BrowserResolver
  planDefinition: fhir4.PlanDefinition
  setNarrativeContent: React.Dispatch<
    React.SetStateAction<NodeContent | undefined>
  >
  selectedNode: string | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView>>
  requestsBundle: fhir4.Bundle | undefined
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setNarrativeContent,
  selectedNode,
  setSelectedNode,
  setSidePanelView,
  requestsBundle,
}: FlowDisplayProps) {
  const [fullFlow, setFullFlow] = useState<Flow | undefined>()
  const [visibleNodes, setVisibleNodes] = useState<Node[] | undefined>()
  const [visibleEdges, setVisibleEdges] = useState<Edge[] | undefined>()
  const [expandedView, setExpandedView] = useState<boolean>(true)
  const [nodeToExpand, setNodeToExpand] = useState<string>()

  const nodeTypes = useMemo(
    () => ({
      contentNode: ContentNode,
      startNode: StartNode,
      applicabilityNode: ApplicabilityNode,
    }),
    []
  ) as NodeTypes

  const generatePlanDefinitionFlow = () => {
    const flow = new Flow(planDefinition, resolver)
    if (resolver && resolver.resourcesByCanonical) {
      flow.generateInitialFlow()
      flow
        .positionNodes({
          setNodeToExpand,
          setSelectedNode,
        })
        .then((updatedFlow) => {
          setFullFlow(updatedFlow)
          setVisibleNodes(updatedFlow.nodes)
          setVisibleEdges(updatedFlow.edges)
        })
    }
  }

  useEffect(() => {
    generatePlanDefinitionFlow()
  }, [])

  useEffect(() => {
    if (visibleNodes != null && selectedNode != null) {
      const node = visibleNodes.find((n) => n.id === selectedNode)
      setVisibleNodes(Flow.setSelectedNode(visibleNodes, node?.id ?? undefined))
      if (node != null) {
        setNarrativeContent(node.data.nodeContent)
        setSidePanelView('narrative')
      } else {
        console.log(`Unable to find selected node ${selectedNode}`)
      }
    }
  }, [selectedNode])

  useEffect(() => {
    if (fullFlow?.nodes != null && fullFlow?.edges != null) {
      if (!expandedView) {
        const newFlow = new Flow(
          planDefinition,
          resolver,
          fullFlow.nodes,
          fullFlow.edges
        )
        newFlow.collapseAllChildren().then(() => {
          setVisibleNodes(newFlow.nodes)
          setVisibleEdges(newFlow.edges)
        })
      } else {
        setVisibleNodes(fullFlow.nodes)
        setVisibleEdges(fullFlow.edges)
      }
    }
  }, [expandedView])

  const reactFlow = useReactFlow()
  useEffect(() => {
    if (
      nodeToExpand != null &&
      fullFlow?.nodes != null &&
      fullFlow?.edges != null
    ) {
      const sourceNode = fullFlow.nodes.find((n) => n.id === nodeToExpand)
      if (sourceNode != null) {
        const newFlow = new Flow(
          planDefinition,
          resolver,
          visibleNodes,
          visibleEdges
        )
        newFlow
          .expandChild(sourceNode, fullFlow.nodes, fullFlow.edges)
          .then((updatedFlow) => {
            setVisibleNodes(updatedFlow.nodes)
            setVisibleEdges(updatedFlow.edges)
            newFlow.centerOnNode(nodeToExpand, 60, 1, reactFlow)
            setSelectedNode(sourceNode.id)
          })
      } else {
        console.log(
          `Unable to find source node ${nodeToExpand} for graph expansion.`
        )
      }
    }
  }, [nodeToExpand])

  useEffect(() => {
    if (fullFlow != null && requestsBundle != null) {
      resolver.addResourcesFromBundle(requestsBundle)
      const newFlow = new Flow(planDefinition, resolver)
      newFlow.generateRequestGroupFlow(requestsBundle, planDefinition)
      if (newFlow != null) {
        newFlow
          .positionNodes({
            setNodeToExpand,
            setSelectedNode,
          })
          .then((updatedFlow) => {
            setVisibleNodes(updatedFlow.nodes)
            setVisibleEdges(updatedFlow.edges)
            setFullFlow(updatedFlow)
          })
      } else {
        console.log('Unable to generate Request Group')
      }
    } else if (fullFlow != null) {
      generatePlanDefinitionFlow()
    }
  }, [requestsBundle])

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
