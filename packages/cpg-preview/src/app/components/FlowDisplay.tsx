'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import ReactFlow, { Edge, Node, Background, Controls, MiniMap, applyNodeChanges } from 'reactflow'
import Flow from '../model/Flow'
import ActionNode from '@/components/ActionNode'
import DetailsNode from './DetailsNode'
import SelectionEdge from '@/components/SelectionEdge'
import FileResolver from 'resolver/file'
import ELK, { ElkNode } from 'elkjs'
import Graph from '../model/Graph'

const elk = new ELK()

interface FlowDisplayProps {
  resolver: FileResolver | undefined
  planDefinition: fhir4.PlanDefinition
  setDetails: React.Dispatch<React.SetStateAction<fhir4.PlanDefinitionAction | fhir4.PlanDefinition | undefined>>
}

export default function FlowDisplay({ resolver, planDefinition, setDetails }: FlowDisplayProps) {
  const [nodes, setNodes] = useState<Node[] | undefined>()
  const [edges, setEdges] = useState<Edge[] | undefined>()
  const [selected, setSelected] = useState<Node | undefined>()

  const nodeTypes = useMemo(() => ({ actionNode: ActionNode, detailsNode: DetailsNode }), [])
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

    // if (selected && nodes) {
    //   const match = nodes.map(e => e.id).indexOf(selected.id)
    //   console.log(match + 'match')
    //   const newNodes = nodes
    //   if (newNodes[match] && newNodes[match].data) {
    //     newNodes[match].data = {...newNodes[match].data, selected: true}
    //   }
    //   console.log(newNodes[match])
    //   setNodes(newNodes)
    //   setSelected(undefined)
    // }
  }, [selected])

  const handleNodeClick = (event: React.MouseEvent<Element, MouseEvent>, node: Node) => {
    setSelected(node)
    setDetails(node.data.details)
    console.log(node)
  }


  return (
    <div className='flow-container'>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        fitView={true}
        elevateEdgesOnSelect={true}
        onNodeClick={handleNodeClick}
        // onNodesChange={onNodesChange}
      >
        <Background color="#ccc" />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  )
}
