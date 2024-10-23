import { Edge, Node } from 'reactflow'
import ELK, { ElkExtendedEdge, ElkNode } from 'elkjs'
import { FlowShape } from './Flow'

class Graph {
  id: string
  layoutOptions: any
  children: ElkNode[] | undefined
  edges: ElkExtendedEdge[] | undefined

  constructor() {
    this.id = 'root'
    this.layoutOptions = {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '200',
      'org.eclipse.elk.spacing.nodeNode': '200',
      'org.eclipse.elk.layered.crossingMinimization.forceNodeModelOrder':
        'true',
    }
  }

  public generateElkEdges(reactEdges: Edge[]) {
    this.edges = reactEdges.map((e) => {
      return {
        ...e,
        sources: [e.source],
        targets: [e.target],
      } as ElkExtendedEdge
    }) as ElkExtendedEdge[]
  }

  private createNewNode(reactNode: Node) {
    return {
      id: reactNode.id,
      label: reactNode.data.label,
    }
  }

  public generateElkNodes(reactNodes: Node[]) {
    this.children = reactNodes.map((n) => {
      return this.createNewNode(n)
    })
  }

  public async generateElkGraph(flow: FlowShape) {
    const elk = new ELK()
    flow.nodes ? this.generateElkNodes(flow.nodes) : null
    flow.edges ? this.generateElkEdges(flow.edges) : null
    await elk.layout(this).then((g: ElkNode) => {
      this.children = g.children
      this.edges = g.edges
    })
    return this
  }
}

export default Graph
