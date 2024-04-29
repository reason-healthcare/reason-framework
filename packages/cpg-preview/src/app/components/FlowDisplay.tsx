'use client'
import { useState, useEffect, useMemo } from 'react'
import ReactFlow, { Edge, Node, Background, Controls, MiniMap } from 'reactflow'
import Flow from '../model/Flow'
import ActionNode from '@/components/ActionNode'
import SelectionEdge from '@/components/SelectionEdge'
import FileResolver from 'resolver/file'
import ELK, { ElkNode } from 'elkjs'
import Graph from '../model/Graph'

const elk = new ELK()

interface FlowDisplayPorps {
  resolver: FileResolver | undefined
  planDefinition: fhir4.PlanDefinition
}

export default function FlowDisplay({ resolver, planDefinition }: FlowDisplayPorps) {
  const [nodes, setNodes] = useState<Node[] | undefined>()
  const [edges, setEdges] = useState<Edge[] | undefined>()

  const nodeTypes = useMemo(() => ({ actionNode: ActionNode }), [])
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
      >
        <Background color="#ccc" />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  )
}
