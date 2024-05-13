'use client'
import { useState, useEffect, useMemo } from 'react'
import ReactFlow, {
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
  getIncomers,
  getOutgoers,
  ControlButton,
  applyNodeChanges,
} from 'reactflow'
import Flow from '../model/Flow'
import ActionNode from './ActionNode'
import DefinitionNode from './DefinitionNode'
import SelectionEdge from './SelectionEdge'
import FileResolver from 'resolver/file'
import ELK, { ElkNode } from 'elkjs'
import Graph from '../model/Graph'
import {FullscreenOutlined, FullscreenExitOutlined} from '@ant-design/icons'

interface FlowDisplayProps {
  resolver: FileResolver | undefined
  planDefinition: fhir4.PlanDefinition
  setSelected: React.Dispatch<React.SetStateAction<Node | undefined>>
  selected: Node | undefined
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setSelected,
  selected,
}: FlowDisplayProps) {
  // const [flow, setFlow] = useState<any | undefined>()
  // const [graph, setGraph] = useState<any | undefined>()
  const [allNodes, setAllNodes] = useState<Node[] | undefined>()
  const [allEdges, setAllEdges] = useState<Edge[] | undefined>()
  const [displayNodes, setDisplayNodes] = useState<Node[] | undefined>()
  const [displayEdges, setDisplayEdges] = useState<Edge[] | undefined>()
  // const [collapsed, setCollapsed] = useState<string[]>([])
  const [expandedView, setExpandedView] = useState<boolean>(true)

  const nodeTypes = useMemo(
    () => ({ actionNode: ActionNode, definitionNode: DefinitionNode }),
    []
  )
  const edgeTypes = useMemo(() => ({ selectionEdge: SelectionEdge }), [])

  useEffect(() => {
    const flow = new Flow()
    if (resolver && resolver.resourcesByCanonical) {
      flow.generateInitialFlow(planDefinition, resolver)
      flow.generateFinalFlow().then(f => {
        setAllNodes(f.nodes)
        setAllEdges(f.edges)
        setDisplayNodes(f.nodes)
        setDisplayEdges(f.edges)

      })
    }
  }, [])

  useEffect(() => {
    if (!selected && displayNodes) {
      setDisplayNodes(
        displayNodes.map((node) => {
          return {
            ...node,
            selected: false,
          }
        })
      )
    } else if (selected?.position) {
      // const { x, y } = selected.position
      // const { zoom } = reactFlow.getViewport()
      // const zoomFactor = zoom < 0.3 ? 0.5 : 0
      // reactFlow.setCenter(x + 100, y, {duration: 30, zoom: zoom + zoomFactor})
    }
  }, [selected])

  // const getNestedElements = (id: string, nestedNodes: Node[] = []) => {
  //   if (nodes && edges) {
  //     const outgoers = getOutgoers({ id } as Node, nodes, edges)
  //     outgoers?.forEach((outgoer) => {
  //       nestedNodes.push(outgoer)
  //       getNestedElements(outgoer.id, nestedNodes)
  //     })
  //   }
  //   return nestedNodes
  // }

  // const getHiddenElements = (
  //   id: string,
  //   hiddenNodes: Node[] = [],
  //   hiddenEdges: Edge[] = []
  // ) => {
  //   if (nodes && edges) {
  //     const outgoers = getOutgoers({ id } as Node, nodes, edges)
  //     outgoers?.forEach((outgoer) => {
  //       const connection = edges.find(
  //         (e) => e.source === id && e.target === outgoer.id
  //       )
  //       connection ? hiddenEdges.push(connection) : null
  //       // if type = definition, the node may have other incomers
  //       if (outgoer.type === 'definitionNode') {
  //         const incomers = getIncomers(outgoer, nodes, edges)
  //         const nestedNodes = collapsed.flatMap((c) => getNestedElements(c))
  //         // check each incomer to see if it is included in nested nodes, if there is an incomer that is not accounted for, display the node and stop processing
  //         if (
  //           incomers.some(
  //             (i) => !nestedNodes.find((n) => i.id === n.id) && i.id !== id
  //           )
  //         ) {
  //           return { hiddenNodes, hiddenEdges }
  //         }
  //         // if there is a display node other than the one currently being processed that leads to the outgoer, do not hide it
  //         if (
  //           hiddenNodes?.find(
  //             (n) => n.id !== id && incomers.find((i) => i.id === n.id)
  //           )
  //         ) {
  //           return { hiddenNodes, hiddenEdges }
  //         }
  //       }
  //       hiddenNodes.push(outgoer)
  //       getHiddenElements(outgoer.id, hiddenNodes, hiddenEdges)
  //     })
  //   }
  //   return { hiddenNodes, hiddenEdges }
  // }


  useEffect(() => {

    const flow = new Flow(allNodes, allEdges)
    if (!expandedView && allNodes && allEdges) {
      if (planDefinition.id) {
        flow.collapseAllFromSource(planDefinition.id)
      }
    }
    setDisplayNodes(flow.nodes)
    setDisplayEdges(flow.edges)
  }, [expandedView])

  // useEffect(() => {
  //   console.log(displayNodes?.length)
  //   console.log('here')
  //   const flow = new Flow(displayNodes, displayEdges)
  //   flow.generateFinalFlow(data)
  // }, [collapsed])

  const handleNodeClick = (
    event: React.MouseEvent<Element, MouseEvent>,
    node: Node
  ) => {
    setSelected(node)
  }

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
        onNodeClick={handleNodeClick}
      >
        <Background color="#ccc" />
        <MiniMap pannable zoomable />
        <Controls>
          <ControlButton onClick={handleExpandedViewClick}>
            {expandedView ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  )
}
