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
  useReactFlow,
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

  const reactFlow = useReactFlow()

  useEffect(() => {
    if (!selected && displayNodes) {
      setDisplayNodes(displayNodes.map((node) => {
        return {
          ...node,
          selected: false
        }
      }))
    } else if (selected?.position) {
      const { x, y } = selected.position
      const { zoom } = reactFlow.getViewport()
      const zoomFactor = zoom < 0.3 ? 0.5 : 0
      reactFlow.setCenter(x + 100, y, {duration: 30, zoom: zoom + zoomFactor})
    }
  }, [selected])

  useEffect(() => {
    const getNestedElements = (id: string, nestedNodes: Node[] = []) => {
      if (nodes && edges) {
        const outgoers = getOutgoers({id} as Node, nodes, edges)
        outgoers?.forEach((outgoer) => {
          nestedNodes.push(outgoer)
          getNestedElements(outgoer.id, nestedNodes)
        })
      }
      return nestedNodes
    }
    const getHiddenElements = (id: string, hiddenNodes: Node[] = [], hiddenEdges: Edge[] = []) => {
      if (nodes && edges) {
        const outgoers = getOutgoers({ id } as Node, nodes, edges)
        outgoers?.forEach((outgoer) => {
          const connection = edges.find(e => e.source === id && e.target === outgoer.id)
          connection ? hiddenEdges.push(connection) : null
          // if type = definition, the node may have other incomers
          if (outgoer.type === 'definitionNode') {
            const incomers = getIncomers(outgoer, nodes, edges)
            const nestedNodes = collapsed.flatMap(c => getNestedElements(c))
            // check each incomer to see if it is included in nested nodes, if there is an incomer that is not accounted for, display the node and stop processing
            if (incomers.some(i => !nestedNodes.find(n => i.id === n.id) && i.id !== id)) {
              return {hiddenNodes, hiddenEdges}
            }
            // if there is a display node other than the one currently being processed that leads to the outgoer, do not hide it
            if (hiddenNodes?.find(n => n.id !== id && incomers.find(i => i.id === n.id))) {
              return {hiddenNodes, hiddenEdges}
            }
          }
          hiddenNodes.push(outgoer)
          getHiddenElements(outgoer.id, hiddenNodes, hiddenEdges)
        })
      }
      return {hiddenNodes, hiddenEdges}
    }

    const hiddenNodes = collapsed.flatMap(c => getHiddenElements(c).hiddenNodes)
    const hiddenEdges = collapsed.flatMap(c => getHiddenElements(c).hiddenEdges)
    const displayN = nodes?.filter(node => !hiddenNodes.find(n => n.id === node.id))
    setDisplayNodes(displayN?.map(n => {
      return {...n, data: {...n.data, collapsed}}
    }))
    setDisplayEdges(edges?.filter(e => !hiddenEdges.find(n => e.id === n.id)))

  }, [collapsed])

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
