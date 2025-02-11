import { Edge, Node, ReactFlowInstance, getOutgoers } from 'reactflow'
import { is, notEmpty } from '../helpers'
import '@/styles/node.css'
import { ElkNode } from 'elkjs'
import * as uuid from 'uuid'
import Graph from './Graph'
import BrowserResolver from 'resolver/browser'

export interface FlowShape {
  nodes: Node[] | undefined
  edges: Edge[] | undefined
  generateFinalFlow(graph: ElkNode): void
}

class Flow implements FlowShape {
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

  private createActivityNode(
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
        nodeData: { nodeDetails: definition },
        isCollapsed: false,
      },
      type: 'contentNode',
      position: { x: 0, y: 0 },
      className: 'node',
    } as Node
  }

  private createActionNode(
    id: string,
    action: fhir4.PlanDefinitionAction,
    planDefinition: fhir4.PlanDefinition
  ) {
    return {
      id,
      data: {
        label: action.title ?? action.id ?? action.description,
        handle: ['target', 'source'],
        nodeData: { nodeDetails: action, partOf: planDefinition },
        isCollapsed: false,
      },
      position: { x: 0, y: 0 },
      type: 'contentNode',
      className: 'node',
    } as Node
  }

  private createApplicabilityNode(
    id: string,
    action: fhir4.PlanDefinitionAction,
    planDefinition: fhir4.PlanDefinition
  ) {
    return {
      id,
      data: {
        label: action.condition![0].expression?.expression,
        handle: ['target', 'source'],
        nodeData: { nodeDetails: action, partOf: planDefinition },
        isCollapsed: false,
      },
      position: { x: 0, y: 0 },
      type: 'applicabilityNode',
      className: 'node',
    } as Node
  }

  private createStartNode(id: string, definition: fhir4.PlanDefinition) {
    return {
      id,
      data: {
        nodeData: { nodeDetails: definition },
        isCollapsed: false,
      },
      position: { x: 0, y: 0 },
      type: 'startNode',
      className: 'start-node node',
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

  private proccessApplicabilityNodes(
    parentId: string,
    index: string,
    action: fhir4.PlanDefinitionAction,
    planDefinition: fhir4.PlanDefinition
  ) {
    const edgeSource = this.createEdge(parentId)
    const applicabilityNode = this.createApplicabilityNode(
      `condition-${parentId}-${index}`,
      action,
      planDefinition
    )
    this.addNewNode(applicabilityNode)
    const edgeFinal = {
      ...edgeSource,
      target: applicabilityNode.id,
      id: `${edgeSource.id} - ${applicabilityNode.id}`,
    }
    this.addNewEdge(edgeFinal)
    return applicabilityNode
  }

  /**
   *
   * @param actions Plan definition actions to process as new node
   * @param resolver FHIR resolver
   * @param parentEdge Edge with source information
   */
  private processActionNodes(
    planDefinition: fhir4.PlanDefinition,
    actions: fhir4.PlanDefinitionAction[],
    resolver: BrowserResolver,
    parentEdge: Edge
  ) {
    actions?.map((action) => {
      /**
       * Create node for each action
       */
      const id = `action-${action.title ?? action.id}-${uuid.v4()}`
      const node = this.createActionNode(id, action, planDefinition)

      //* Handle Applicability - becomes parent of current action node */
      let newParentEdge
      if (action.condition != null) {
        action.condition.forEach((condition, index) => {})
        const applicabilityNode = this.createApplicabilityNode(
          `condition-${id}`,
          action,
          planDefinition
        )
        this.addNewNode(applicabilityNode)
        const applicabilityEdge = {
          ...parentEdge,
          target: applicabilityNode.id,
          id: `${parentEdge.id} - ${applicabilityNode.id}`,
        }
        this.addNewEdge(applicabilityEdge)
        newParentEdge = this.createEdge(applicabilityNode.id)
      }

      const finalParentEdge = newParentEdge ?? parentEdge

      /** Connect to parent */
      const edgeFinal = {
        ...finalParentEdge,
        target: node.id,
        id: `${parentEdge.id} - ${node.id}`,
      }
      this.addNewEdge(edgeFinal)

      /** Handle children */
      const edgeSource = this.createEdge(node.id)
      if (action.selectionBehavior) {
        edgeSource.animated = true
      }
      if (action.definitionCanonical != null) {
        const definition = resolver.resolveCanonical(
          action.definitionCanonical
        ) as fhir4.PlanDefinition | fhir4.ActivityDefinition | undefined
        if (is.PlanDefinition(definition) && definition.action) {
          this.processActionNodes(
            definition,
            definition.action,
            resolver,
            edgeSource
          )
        } else if (
          (is.ActivityDefinition(definition) || is.Questionnaire(definition)) &&
          definition.id
        ) {
          const id = definition.id
          let activityNode = this.nodes?.find((n) => n.id === id)
          if (activityNode == null) {
            activityNode = this.createActivityNode(id, definition)
            activityNode.data.handle = ['target']
            this.addNewNode(activityNode)
          }
          const edgeFinal = {
            ...edgeSource,
            target: activityNode.id,
            id: `${edgeSource.id} - ${activityNode.id}`,
          }
          this.addNewEdge(edgeFinal)
        }
      } else if (action.action != null) {
        this.processActionNodes(
          planDefinition,
          action.action,
          resolver,
          edgeSource
        )
      } else {
        node.data.handle = ['target']
      }
      this.addNewNode(node)
    })
  }

  /**
   * Generate initial react flow from plan definition without layout (all positions are y:0 and x:0)
   * @param planDefinition
   * @param resolver
   * @returns
   */
  public generateInitialFlow(
    planDefinition: fhir4.PlanDefinition,
    resolver: BrowserResolver
  ) {
    if (is.PlanDefinition(planDefinition)) {
      /** Create node if it doesn't exist, find node if it does */
      const id = planDefinition.id || 'start'
      const node = this.createStartNode(id, planDefinition)
      this.addNewNode(node)
      node.data.handle = ['target']

      /** Handle children */
      if (planDefinition.action != null) {
        const edgeSource = this.createEdge(node.id)
        this.processActionNodes(
          planDefinition,
          planDefinition.action,
          resolver,
          edgeSource
        )
      } else {
        // TODO error handling
      }
    }
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
      const sourceNode = this.nodes?.find((n) => n.id === id)
      if (!sourceNode) {
        console.error('Unable to collapse graph')
      } else {
        const sourceNodes = [sourceNode]
        children = getOutgoers(sourceNode, this.nodes, this.edges).flatMap(
          (child) => {
            if (
              child.type === 'applicabilityNode' &&
              this.nodes != null &&
              this.edges != null
            ) {
              sourceNodes.push(child)
              return getOutgoers(child, this.nodes, this.edges)
            } else {
              return child
            }
          }
        )
        this.setNodes = sourceNodes.concat([
          ...children.map((c) => {
            return { ...c, data: { ...c.data, isCollapsed: true } }
          }),
        ])
        this.setEdges = this.edges.filter(
          (e) =>
            (children?.find((c) => c.id === e.target) ||
              sourceNodes.find((n) => n.id === e.target)) &&
            sourceNodes.find((n) => n.id === e.source)
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
      let children = getOutgoers(sourceNode, allNodes, allEdges)
      const applicabilityNodes = children.filter(
        (node) => node.type === 'applicabilityNode'
      )
      children = children
        .concat(
          applicabilityNodes
            ?.flatMap((n) => getOutgoers(n, allNodes, allEdges))
            .filter((n) => n != null)
        )
        .filter((c) => !this.nodes?.includes(c))
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
          children?.some((c) => c.id === e.target) &&
          (e.source === sourceNode.id ||
            children?.some((c) => c.id === e.source))
      )
      if (childEdges && this.edges) {
        this.setEdges = [...this.edges, ...childEdges]
      }
    }
    await this.generateFinalFlow()
    return this
  }

  public async centerOnNode(
    sourceId: string,
    yAxis: number,
    zoomFactor: number,
    reactFlow: ReactFlowInstance<any, any>
  ) {
    const center = this.nodes?.find((n) => n.id === sourceId)?.position
    if (center) {
      const { x, y } = center
      const { zoom } = reactFlow.getViewport()
      reactFlow.setCenter(x, y + yAxis, { zoom: zoom * zoomFactor })
    }
  }
}

export default Flow
