'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import ReactFlow, {
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  useOnSelectionChange
} from 'reactflow'
import Flow from '../model/Flow'
import ActionNode from './ActionNode'
import DetailsNode from './DetailsNode'
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

  const nodeTypes = useMemo(
    () => ({ actionNode: ActionNode, detailsNode: DetailsNode, definitionNode: DefinitionNode }),
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
