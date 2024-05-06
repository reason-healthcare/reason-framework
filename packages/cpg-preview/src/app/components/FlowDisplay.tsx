'use client'
import { useState, useEffect, useMemo } from 'react'
import ReactFlow, {
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  getOutgoers
} from 'reactflow'
import Flow from '../model/Flow'
import ActionNode from './ActionNode'
import DefinitionNode from './DefinitionNode'
import SelectionEdge from './SelectionEdge'
import FileResolver from 'resolver/file'
import ELK, { ElkNode } from 'elkjs'
import Graph from '../model/Graph'

const elk = new ELK()

interface FlowDisplayProps {
  resolver: FileResolver | undefined
  planDefinition: fhir4.PlanDefinition
  // setDetails: React.Dispatch<
  //   React.SetStateAction<
  //     fhir4.PlanDefinitionAction | fhir4.PlanDefinition | fhir4.ActivityDefinition | undefined
  //   >
  // >
  setSelected: React.Dispatch<React.SetStateAction<Node | undefined>>
  selected: Node | undefined
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setSelected,
  selected
}: FlowDisplayProps) {
  const [nodes, setNodes] = useState<Node[] | undefined>()
  const [edges, setEdges] = useState<Edge[] | undefined>()

  // Display only some nodes
  // Find nodes that are descendants
  // Filter these out from nodes and layout dislay nodes
  // Alternative: fetch data and do not create nodes for descendats

  // Option 1: filtering - find child edge, remove, find target, remove, find edge, remove
  // Track which nodes are expanded and collapsed
  // For each node that is collapsed, remove children

  const nodeTypes = useMemo(
    () => ({ actionNode: ActionNode, definitionNode: DefinitionNode }),
    []
  )
  const edgeTypes = useMemo(() => ({ selectionEdge: SelectionEdge }), [])

  useEffect(() => {
    const flow = new Flow()
    if (resolver && resolver.resourcesByCanonical) {
      flow
        .generateInitialFlow(planDefinition, resolver)
        .then(({ nodes, edges }) => {
          const graph = new Graph()
          nodes ? graph.generateElkNodes(nodes) : null
          edges ? graph.generateElkEdges(edges) : null
          elk.layout(graph).then((g: ElkNode) => {
            flow.generateFinalFlow(g)
            setNodes(flow.nodes)
            setEdges(flow.edges)
          })
        })
    }
  }, [])

  useEffect(() => {
    if (!selected && nodes) {
      setNodes(nodes.map((node) => {
        return {
          ...node,
          selected: false
        }
      }))
    }
  }, [selected])

  // const { getEdges, getNodes, deleteElements } = useReactFlow()

  // function removeTreeOfOutgoers(id: string) {
  //   // we get all outgoers of this node
  //   const outgoers = getOutgoers({ id } as Node, getNodes(), getEdges())

  //   // if there are outgoers we proceed
  //   if (outgoers.length) {
  //     // we remove the outgoer nodes
  //     deleteElements({ nodes: outgoers })

  //     // we loop through the outgoers and try to remove any outgoers of our outgoers
  //     outgoers.forEach((outgoer) => {
  //       removeTreeOfOutgoers(outgoer.id)
  //     })
  //   }
  // }

  const handleNodeClick = (
    event: React.MouseEvent<Element, MouseEvent>,
    node: Node
  ) => {
    setSelected(node)
  }

  return (
    <div className="flow-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        fitView={true}
        elevateEdgesOnSelect={true}
        onNodeClick={handleNodeClick}
      >
        <Background color="#ccc" />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  )
}
