'use client'
import { useState, useEffect, useMemo, use } from 'react'
import ReactFlow, {
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
  ControlButton,
  useReactFlow,
  getViewportForBounds,
} from 'reactflow'
import Flow from '../model/Flow'
import ActionNode from './ActionNode'
import DefinitionNode from './DefinitionNode'
import SelectionEdge from './SelectionEdge'
import FileResolver from 'resolver/file'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'

interface FlowDisplayProps {
  resolver: FileResolver | undefined
  planDefinition: fhir4.PlanDefinition
  setDetails: React.Dispatch<
    React.SetStateAction<
      | fhir4.PlanDefinition
      | fhir4.PlanDefinitionAction
      | fhir4.ActivityDefinition
      | undefined
    >
  >
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setDetails,
  setShowDetails,
}: FlowDisplayProps) {
  const [allNodes, setAllNodes] = useState<Node[] | undefined>()
  const [allEdges, setAllEdges] = useState<Edge[] | undefined>()
  const [displayNodes, setDisplayNodes] = useState<Node[] | undefined>()
  const [displayEdges, setDisplayEdges] = useState<Edge[] | undefined>()
  const [expandedView, setExpandedView] = useState<boolean>(true)
  const [expandNode, setExpandNode] = useState<string>()
  const [selected, setSelected] = useState<string>()
  const [key, setKey] = useState<number>(0)

  const nodeTypes = useMemo(
    () => ({ actionNode: ActionNode, definitionNode: DefinitionNode }),
    []
  )
  const edgeTypes = useMemo(() => ({ selectionEdge: SelectionEdge }), [])

  const data = {
    expandNode,
    setExpandNode,
    selected,
    setSelected,
    setDetails,
    setShowDetails,
  }
  const reactFlow = useReactFlow()

  useEffect(() => {
    const flow = new Flow()
    if (resolver && resolver.resourcesByCanonical) {
      flow.generateInitialFlow(planDefinition, resolver)
      flow.generateFinalFlow(data).then((f) => {
        setAllNodes(f.nodes)
        setAllEdges(f.edges)
        setDisplayNodes(f.nodes)
        setDisplayEdges(f.edges)
      })
    }
  }, [])

  useEffect(() => {
    const flow = new Flow(allNodes, allEdges)
    if (!expandedView && allNodes && allEdges && planDefinition.id) {
      flow.collapseAllFromSource(planDefinition.id).then((f) => {
        setDisplayNodes(flow.nodes)
        setDisplayEdges(flow.edges)
        const center = f.nodes?.find(
          (n) => n.id === `definition-${planDefinition.id}`
        )?.position
        if (center) {
          const { x, y } = center
          const { zoom } = reactFlow.getViewport()
          // const zoomFactor = zoom < 0.3 ? 10 : 0
          reactFlow.setCenter(x, y, { zoom: zoom * 10 })
          const newKey = key + 1
          setKey(newKey)
        }
      })
    } else if (expandedView) {
      setDisplayNodes(allNodes)
      setDisplayEdges(allEdges)
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
      setDetails(displayNodes.find((n) => n.id === selected)?.data.details)
      const newKey = key + 1
      setKey(newKey)
    }
  }, [selected])

  useEffect(() => {
    const flow = new Flow(displayNodes, displayEdges)
    if (expandNode) {
      const sourceNode = allNodes?.find((n) => n.id === expandNode)
      flow.expandChildren(sourceNode, allNodes, allEdges).then((f) => {
        setDisplayNodes(f.nodes)
        setDisplayEdges(f.edges)
        sourceNode ? setSelected(sourceNode.id) : null
      })
      const newKey = key + 1
      setKey(newKey)
    }
  }, [expandNode])

  const handleExpandedViewClick = () => {
    setExpandedView(!expandedView)
  }

  return (
    <div className="flow-container">
      <ReactFlow
        key={key}
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        fitView={true}
        elevateEdgesOnSelect={true}
      >
        <Background color="#ccc" />
        <MiniMap pannable zoomable />
        <Controls showInteractive={false}>
          <ControlButton onClick={handleExpandedViewClick}>
            {expandedView ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  )
}
