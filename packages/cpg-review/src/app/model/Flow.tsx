import ReactFlow, { Edge, Node, useReactFlow, getOutgoers } from 'reactflow'
import { is, notEmpty } from '../helpers'
import '@/styles/node.css'
import '@/styles/edge.css'
import FileResolver from 'resolver/file'
import { ElkNode } from 'elkjs'
import { resolveCanonical } from '../helpers'
import { v4 } from 'uuid'
import Graph from './Graph'
import BrowserResolver from 'resolver/browser'

export interface FlowInstance {
  // extends ReactFlowInstance {
  nodes: Node[] | undefined
  edges: Edge[] | undefined
  generateFinalFlow(graph: ElkNode): void
}

class Flow implements FlowInstance {
  nodes: Node[] | undefined
  edges: Edge[] | undefined
  constructor(nodes?: Node[] | undefined, edges?: Edge[] | undefined) {
    this.nodes = nodes
    this.edges = edges
  }

  set setNodes(n: Node[]) {
    this.nodes = n
  }

  set setEdges(e: Edge[]) {
    this.edges = e
  }

  private addNewNode(node: Node) {
    this.nodes ? this.nodes.push(node) : (this.nodes = [node])
  }

  private addNewEdge(edge: Edge) {
    this.edges ? this.edges.push(edge) : (this.edges = [edge])
  }

  private createDefinitionalNode(
    id: string,
    definition: fhir4.PlanDefinition | fhir4.ActivityDefinition
  ): Node {
    return {
      id,
      data: {
        label:
          definition.title ??
          definition.name ??
          definition.url ??
          definition.id ??
          definition.description,
        details: definition,
        isCollapsed: false,
      },
      type: 'definitionNode',
      position: { x: 0, y: 0 },
      className: 'definition-node node',
    } as Node
  }

  private createActionNode(id: string, action: fhir4.PlanDefinitionAction) {
    return {
      id,
      data: {
        label: action.title ?? action.id ?? action.description,
        details: action,
        isCollapsed: false,
      },
      position: { x: 0, y: 0 },
      type: 'actionNode',
      className: 'node',
    } as Node
  }

  private createEdge(sourceId: string, targetId?: string) {
    const edge = {
      id: `${sourceId}`,
      source: sourceId,
      type: 'smoothstep',
      className: 'edge',
    } as Edge
    if (targetId) {
      edge.target = targetId
    }
    return edge
  }

  /**
   * Create new node based on activity or plan. If node already exists for plan/activity, the source action should be routed to existing node.
   * @param definition Activity or Plan definition canonical to process as new node
   * @param content FHIR content
   * @param parentEdge Edge with source information
   */
  private processDefinitionalNode(
    definition: fhir4.ActivityDefinition | fhir4.PlanDefinition | undefined,
    content: BrowserResolver,
    parentEdge?: Edge
  ) {
    if (definition) {
      /** Create node if it doesn't exist, find node if it does */
      const id = `definition-${definition.id}`
      const match = this.nodes?.find((n) => n.id === id)
      const node = match ?? this.createDefinitionalNode(id, definition)
      !match ? this.addNewNode(node) : null

      /** Connect to parent */
      if (parentEdge) {
        parentEdge.target = node.id
        parentEdge.id += node.id
        this.addNewEdge(parentEdge)
      } else {
        node.data.handle = 'input'
      }

      /** Handle children */
      if (is.PlanDefinition(definition) && definition.action) {
        const targetEdge = this.createEdge(node.id)
        if (!match) {
          this.processActionNodes(definition.action, content, targetEdge)
        }
      } else {
        node.data.handle = 'output'
      }
    }
  }

  /**
   *
   * @param actions Plan definition actions to process as new node
   * @param content FHIR content
   * @param parentEdge Edge with source information
   */
  private processActionNodes(
    actions: fhir4.PlanDefinitionAction[],
    content: BrowserResolver,
    parentEdge: Edge
  ) {
    actions.map((action) => {
      /**
       * Create node for each action
       * ID needs to be unique - definition nodes are deduped, action nodes are not
       */
      const id = `action-${action.title}-${v4()}`
      const actionNode = this.createActionNode(id, action)
      this.addNewNode(actionNode)

      /** Connect to parent */
      const sourceEdge = { ...parentEdge, target: id, id: parentEdge.id + id }
      this.addNewEdge(sourceEdge)

      /** Handle children */
      const targetEdge = this.createEdge(actionNode.id)
      if (action.selectionBehavior) {
        targetEdge.animated = true
      }
      if (action.definitionCanonical) {
        const definition = resolveCanonical(
          action.definitionCanonical,
          content
        ) as fhir4.ActivityDefinition | fhir4.PlanDefinition | undefined
        if (definition) {
          this.processDefinitionalNode(definition, content, targetEdge)
        }
      } else if (action.action) {
        this.processActionNodes(action.action, content, targetEdge)
      }
      if (!action.definitionCanonical && !action.action) {
        actionNode.data.handle = 'output'
      }
    })
  }

  /**
   * Generate initial react flow from plan definition without layout (all positions are y:0 and x:0)
   * @param planDefinition
   * @param content
   * @returns
   */
  public generateInitialFlow(
    planDefinition: fhir4.PlanDefinition,
    content: BrowserResolver
  ) {
    this.processDefinitionalNode(planDefinition, content)
    return this
  }

  /**
   * Generate final react flow with updated layout positions
   * @param graph
   */
  public async generateFinalFlow(data?: any) {
    const graph = new Graph()
    await graph.generateElkGraph(this).then((g) => {
      if (this.nodes && this.edges) {
        this.nodes = graph.children
          ?.map((node) => {
            const reactNode = this.nodes?.find((n) => n.id === node.id)
            if (node.x && node.y && reactNode) {
              return {
                ...reactNode,
                position: { x: node.x, y: node.y },
                data: { ...reactNode.data, ...data },
              }
            }
          })
          .filter(notEmpty)

        this.edges = graph.edges
          ?.map((edge) => {
            const reactEdge = this.edges?.find((e) => e.id === edge.id)
            if (edge.sources && edge.targets && reactEdge) {
              return {
                ...reactEdge,
                source: edge.sources[0],
                target: edge.targets[0],
              }
            }
          })
          .filter(notEmpty)
      }
    })
    return this
  }

  public async collapseAllFromSource(id: string) {
    let children: Node[] | undefined
    if (this.nodes && this.edges) {
      const sourceNode = this.nodes?.find((n) => n.id === `definition-${id}`)
      if (!sourceNode) {
        console.error('Unable to collapse graph')
      } else {
        children = getOutgoers(sourceNode, this.nodes, this.edges)
        this.setNodes = [
          ...children.map((c) => {
            return { ...c, data: { ...c.data, isCollapsed: true } }
          }),
          sourceNode,
        ]
        this.setEdges = this.edges.filter(
          (e) =>
            children?.some((c) => c.id === e.target) &&
            e.source === sourceNode.id
        )
      }
    }
    await this.generateFinalFlow()
    return this
  }

  public async expandChildren(
    sourceNode: Node | undefined,
    allNodes: Node[] | undefined,
    allEdges: Edge[] | undefined
  ) {
    if (sourceNode && allNodes && allEdges) {
      // On node click, find outgoers and add to display nodes then regraph
      const children = getOutgoers(sourceNode, allNodes, allEdges).filter(
        (c) => !this.nodes?.includes(c)
      )
      if (children && this.nodes) {
        this.setNodes = [
          ...this.nodes.map((n) => {
            let node = n
            if (n.id === sourceNode.id) {
              node = { ...n, data: { ...n.data, isCollapsed: false } }
            }
            return node
          }),
          ...children.map((c) => {
            return { ...c, data: { ...c.data, isCollapsed: true } }
          }),
        ]
      }
      const childEdges = allEdges.filter(
        (e) =>
          children?.some((c) => c.id === e.target) && e.source === sourceNode.id
      )
      if (childEdges && this.edges) {
        this.setEdges = [...this.edges, ...childEdges]
      }
    }
    await this.generateFinalFlow()
    return this
  }
}

export default Flow
