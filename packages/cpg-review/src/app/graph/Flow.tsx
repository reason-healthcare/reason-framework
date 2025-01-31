import { Edge, Node, ReactFlowInstance, getOutgoers } from 'reactflow'
import { is, notEmpty, getNodeIdFromResource } from '../helpers'
import '@/styles/node.css'
import { v4 } from 'uuid'
import Graph from './Graph'
import BrowserResolver from 'resolver/browser'

export interface FlowShape {
  nodes: Node[] | undefined
  edges: Edge[] | undefined
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

  private createEndNode(
    resource: fhir4.ActivityDefinition | fhir4.Questionnaire
  ): Node {
    const id = getNodeIdFromResource(resource)
    return {
      id,
      data: {
        label: id,
        handle: ['target'],
        nodeContent: { resource },
        isCollapsed: false,
        isSelected: false,
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
    const {title, id: actionId, description} = action
    return {
      id,
      data: {
        label: title ?? actionId ?? description,
        handle: ['target', 'source'],
        nodeContent: { resource: action, partOf: planDefinition },
        isCollapsed: false,
        isSelected: false,
      },
      type: 'contentNode',
      position: { x: 0, y: 0 },
      className: 'node',
    } as Node
  }

  private createApplicabilityNode(
    id: string,
    condition: fhir4.PlanDefinitionActionCondition,
    action: fhir4.PlanDefinitionAction,
    planDefinition: fhir4.PlanDefinition
  ) {
    const {expression, kind} = condition
    return {
      id,
      data: {
        label: expression != null ? expression.name ?? expression.expression ?? expression.description : kind,
        handle: ['target', 'source'],
        nodeContent: { resource: action, partOf: planDefinition },
        isCollapsed: false,
      },
      type: 'applicabilityNode',
      position: { x: 0, y: 0 },
      className: 'node',
    } as Node
  }

  private createStartNode(id: string, definition: fhir4.PlanDefinition) {
    return {
      id,
      data: {
        nodeContent: { resource: definition },
        isCollapsed: false,
      },
      position: { x: 0, y: 0 },
      type: 'startNode',
      className: 'start-node node',
    } as Node
  }

  private createEdge(sourceId: string, targetId: string) {
    const edge = {
      id: `${sourceId} - ${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      className: 'edge',
    } as Edge
    return edge
  }

  private connectNodes(
    sourceId: string,
    targetId: string,
    selectionBehavior: fhir4.PlanDefinitionAction['selectionBehavior'] | undefined
  ) {
    const edge = this.createEdge(sourceId, targetId)
    if (selectionBehavior != null) {
      edge.animated = true
    }
    this.addNewEdge(edge)
  }

  /**
   * @param planDefinition Plan definition source data
   * @param actions Plan definition actions to process as new nodes
   * @param resolver FHIR resolver
   * @param parent Parent node that will connect to new child node
   * @param parentSelection Selection behavior if any of the parent node
   */
  private processActionNodes(
    planDefinition: fhir4.PlanDefinition,
    actions: fhir4.PlanDefinitionAction[],
    resolver: BrowserResolver,
    parent: Node,
    parentSelection?: fhir4.PlanDefinitionAction['selectionBehavior'] | undefined
  ) {
    actions?.map((action) => {
      const { title, id, condition, definitionCanonical, selectionBehavior, action: childActions } = action
      const nodeId = `action-${title ?? id}-${v4()}`
      /**
       * Handle Applicability - becomes parent of current action node
       */
      let currentParent = parent
      if (condition != null) {
        condition.forEach((condition) => {
          const applicabilityNode = this.createApplicabilityNode(
            `condition-${nodeId}`,
            condition,
            action,
            planDefinition
          )
          this.addNewNode(applicabilityNode)
          this.connectNodes(currentParent.id, applicabilityNode.id, parentSelection)
          currentParent = applicabilityNode
        })
      }

      /**
       * Create action node
       */
      const node = this.createActionNode(nodeId, action, planDefinition)

      /**
       * Handle children
       */
      if (definitionCanonical != null) {
        const definition = resolver.resolveCanonical(
          action.definitionCanonical
        ) as fhir4.PlanDefinition | fhir4.ActivityDefinition | undefined
        /** Process definition canonical = plan definition */
        if (is.PlanDefinition(definition) && definition.action != null) {
          this.processActionNodes(
            definition,
            definition.action,
            resolver,
            node,
            selectionBehavior
          )
        /** Process definition canonical = activity definition or questionnaire */
        } else if (
          is.ActivityDefinition(definition) || is.Questionnaire(definition)
        ) {
          let endNode = this.nodes?.find((n) => n.id === id)
          if (endNode == null) {
            endNode = this.createEndNode(definition)
            this.addNewNode(endNode)
          }
          this.connectNodes(node.id, endNode.id, parentSelection)
        }
      /** Process child actions */
      } else if (childActions != null) {
        this.processActionNodes(
          planDefinition,
          childActions,
          resolver,
          node,
          selectionBehavior
        )
      } else {
        /** Where there are no child nodes, the final node should be of type 'target'  */
        node.data.handle = ['target']
      }
      this.addNewNode(node)
      this.connectNodes(currentParent.id, node.id, parentSelection)
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
      const node = this.createStartNode('start', planDefinition)
      this.addNewNode(node)

      /** Handle children */
      if (planDefinition.action != null) {
        this.processActionNodes(
          planDefinition,
          planDefinition.action,
          resolver,
          node
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
  public async positionNodes(data?: any) {
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

  public async collapseAllNodes(
  ) {
    let children: Node[] | undefined
    if (this.nodes && this.edges) {
      const sourceNode = this.nodes?.find((n) => n.id === 'start')
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
    await this.positionNodes()
    return this
  }

  public async expandChildren(
    sourceNode: Node | undefined,
    allNodes: Node[] | undefined,
    allEdges: Edge[] | undefined
  ) {
    if (sourceNode && allNodes && allEdges) {
      // On node click, find outgoers, add to display nodes, then regraph
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
    await this.positionNodes()
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
