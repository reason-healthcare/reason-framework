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
import ActionNode from './ActionNode'
import DefinitionNode from './DefinitionNode'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import BrowserResolver from 'resolver/browser'

interface FlowDisplayProps {
  resolver: BrowserResolver | undefined
  planDefinition: fhir4.PlanDefinition
  setJson: React.Dispatch<
    React.SetStateAction<
      | fhir4.PlanDefinition
      | fhir4.PlanDefinitionAction
      | fhir4.ActivityDefinition
      | undefined
    >
  >
  setShowNarrative: React.Dispatch<React.SetStateAction<boolean>>
  showNarrative: boolean
  selected: string | undefined
  setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setJson,
  setShowNarrative,
  showNarrative,
  selected,
  setSelected,
}: FlowDisplayProps) {
  const [expandedFlow, setExpandedFlow] = useState<Flow | undefined>()
  const [displayNodes, setDisplayNodes] = useState<Node[] | undefined>()
  const [displayEdges, setDisplayEdges] = useState<Edge[] | undefined>()
  const [expandedView, setExpandedView] = useState<boolean>(true)
  const [expandedNode, setexpandedNode] = useState<string>()
  // Changing key triggers re-render of ReactFlow component
  const [key, setKey] = useState<number>(0)

  const nodeTypes = useMemo(
    () => ({ actionNode: ActionNode, definitionNode: DefinitionNode }),
    []
  )

  const data = {
    expandedNode,
    setexpandedNode,
    selected,
    setSelected,
    setJson,
    setShowNarrative,
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
    if (selected && displayNodes) {
      setDisplayNodes(
        displayNodes.map((node) => {
          return {
            ...node,
            data: { ...node.data, ...data },
          }
        })
      )
      const selectedNode = displayNodes.find((n) => n.id === selected)
      setJson(selectedNode?.data.json)
    }
  }, [selected])

  useEffect(() => {
    const flow = new Flow(displayNodes, displayEdges)
    if (expandedNode) {
      const sourceNode = expandedFlow?.nodes?.find((n) => n.id === expandedNode)
      flow
        .expandChildren(sourceNode, expandedFlow?.nodes, expandedFlow?.edges)
        .then((f) => {
          setDisplayNodes(f.nodes)
          setDisplayEdges(f.edges)
          sourceNode ? setSelected(sourceNode.id) : null
          flow.centerOnNode(expandedNode, 60, 1, reactFlow)
        })
    }
  }, [expandedNode])

  useEffect(() => {
    const newKey = key + 1
    setKey(newKey)
  }, [showNarrative])

  const handleExpandedViewClick = () => {
    setExpandedView(!expandedView)
    setSelected(undefined)
    setexpandedNode(undefined)
  }

  const nodeColor = (node: Node) => {
    switch (node.type) {
      case 'definitionNode':
        return 'var(--teal)'
      case 'actionNode':
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
