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
  getConnectedEdges
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
  const [displayNodes, setDisplayNodes] = useState<Node[] | undefined>(nodes)
  const [displayEdges, setDisplayEdges] = useState<Edge[] | undefined>(edges)
  const [collapsed, setCollapsed] = useState<string[]>([])

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
            const allNodes = flow.nodes?.map(n => {
              return {...n, data: {...n.data, setCollapsed, collapsed}}
            })
            setNodes(allNodes)
            setDisplayNodes(allNodes)
            setEdges(flow.edges)
            setDisplayEdges(flow.edges)
          })
        })
    }
  }, [])

  const getNestedNodes = (id: string, nestedNodes: Node[] = []) => {
    if (nodes && edges) {
      const outgoers = getOutgoers({ id } as Node, nodes, edges);

      outgoers?.forEach((outgoer) => {
        nestedNodes.push(outgoer)
        getNestedNodes(outgoer.id, nestedNodes)
      })
    }
    return nestedNodes
  }

  useEffect(() => {
    if (!selected && nodes) {
      setNodes(nodes.map((node) => {
        return {
          ...node,
          selected: false
        }
      }))
    }
    const nested = collapsed.flatMap(c => getNestedNodes(c))
    // hidden is list of nodes that should be collapsed, excluding parent
    // if any of these have sources that are not included in collapsed, the node should not be hidden

    // get edges that connect outgoing nodes
    // get incomers, returns list of source nodes - get source nodes - if source is not in collapsed array, do not remove, the node
    if (edges) {
      const connections = getConnectedEdges(nested, edges)
      console.log(JSON.stringify(connections))
      setDisplayEdges(edges.filter(e => !connections.find(c => c.id === e.id)))
    }
    const hidden = nested.filter(n => {
      let incomers: Node[]
      if (nodes && edges) {
        incomers = getIncomers(n, nodes, edges)
      }
      return !collapsed.find(c => incomers?.find(i => i.id === c))
    })
    if (hidden) {
      const display = nodes?.filter(node => !hidden.find(n => n.id === node.id))
      setDisplayNodes(display)
    }
  }, [selected, collapsed])

  const handleNodeClick = (
    event: React.MouseEvent<Element, MouseEvent>,
    node: Node
  ) => {
    setSelected(node)
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
        <Controls />
      </ReactFlow>
    </div>
  )
}
