'use client'
import { useState, useEffect, useMemo } from 'react'
import ReactFlow, {
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
  ControlButton,
  useReactFlow
} from 'reactflow'
import Flow from '../model/Flow'
import ActionNode from './ActionNode'
import DefinitionNode from './DefinitionNode'
import SelectionEdge from './SelectionEdge'
import FileResolver from 'resolver/file'
import {FullscreenOutlined, FullscreenExitOutlined} from '@ant-design/icons'

interface FlowDisplayProps {
  resolver: FileResolver | undefined
  planDefinition: fhir4.PlanDefinition
  setDetails: React.Dispatch<React.SetStateAction<fhir4.PlanDefinition | fhir4.PlanDefinitionAction | fhir4.ActivityDefinition | undefined>>
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setDetails,
  setShowDetails
}: FlowDisplayProps) {
  const [allNodes, setAllNodes] = useState<Node[] | undefined>()
  const [allEdges, setAllEdges] = useState<Edge[] | undefined>()
  const [displayNodes, setDisplayNodes] = useState<Node[] | undefined>()
  const [displayEdges, setDisplayEdges] = useState<Edge[] | undefined>()
  const [expandedView, setExpandedView] = useState<boolean>(true)
  const [expandNode, setExpandNode] = useState<string>()
  const [selected, setSelected] = useState<string>()

  const nodeTypes = useMemo(
    () => ({ actionNode: ActionNode, definitionNode: DefinitionNode }),
    []
  )
  const edgeTypes = useMemo(() => ({ selectionEdge: SelectionEdge }), [])

  const data = {expandNode, setExpandNode, selected, setSelected, setDetails, setShowDetails}
  const reactFlow = useReactFlow()


  useEffect(() => {
    const flow = new Flow()
    if (resolver && resolver.resourcesByCanonical) {
      flow.generateInitialFlow(planDefinition, resolver)
      flow.generateFinalFlow(data).then(f => {
        setAllNodes(f.nodes)
        setAllEdges(f.edges)
        setDisplayNodes(f.nodes)
        setDisplayEdges(f.edges)

      })
    }
  }, [])

  useEffect(() => {
    const flow = new Flow(allNodes, allEdges)
    if (!expandedView && allNodes && allEdges) {
      if (planDefinition.id) {
        flow.collapseAllFromSource(planDefinition.id).then(f => {
          setDisplayNodes(flow.nodes)
          setDisplayEdges(flow.edges)
        })
      }
    } else {
      setDisplayNodes(allNodes)
      setDisplayEdges(allEdges)
    }
  }, [expandedView])

  useEffect(() => {
    if (selected && displayNodes) {
      setDisplayNodes(
        displayNodes.map((node) => {
          return {
            ...node,
            data: {...node.data, ...data}
          }
        })
      )
      setDetails(displayNodes.find(n => n.id === selected)?.data.details)
    }
  }, [selected])

  useEffect(() => {
    const flow = new Flow(displayNodes, displayEdges)
    if (expandNode) {
      const sourceNode = allNodes?.find(n => n.id === expandNode)
      flow.expandChildren(sourceNode, allNodes, allEdges).then(f => {
        setDisplayNodes(f.nodes)
        setDisplayEdges(f.edges)
        // const center = f.nodes?.find(n => n.id === expandNode)?.position
        // if (center) {
        //   const { x, y } = center
        //   const { zoom } = reactFlow.getViewport()
        //   // const zoomFactor = zoom < 0.3 ? 0.5 : 0
        //   reactFlow.setCenter(x + 100, y, {duration: 30, zoom: zoom})
        // }
        sourceNode ? setSelected(sourceNode.id) : null
      })
    }
  }, [expandNode])



  // const handleNodeClick = (
  //   event: React.MouseEvent<Element, MouseEvent>,
  //   node: Node
  // ) => {
  //   setSelected(node)
  // }

  const handleExpandedViewClick = () => {
    setExpandedView(!expandedView)
  }

  return (
    <div className="flow-container">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        fitView={true}
        elevateEdgesOnSelect={true}
        // onNodeClick={handleNodeClick}
      >
        <Background color="#ccc" />
        <MiniMap pannable zoomable />
        <Controls
          showInteractive={false}
        >
          <ControlButton onClick={handleExpandedViewClick}>
            {expandedView ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  )
}
