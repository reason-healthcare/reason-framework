import { Edge, Node, ReactFlowInstance, getOutgoers } from 'reactflow'
import { is, notEmpty, RequestResource, getNodeLabelFromResource, getNodeIdFromResource } from '../helpers'
import '@/styles/node.css'
import { v4 } from 'uuid'
import Graph from './Graph'
import BrowserResolver from 'resolver/browser'
import { PlanDefinition } from 'fhir/r4'

export interface FlowShape {
  nodes: Node[] | undefined
  edges: Edge[] | undefined
  planDefinition: fhir4.PlanDefinition | undefined
  resolver: BrowserResolver | undefined
}

class Flow implements FlowShape {
  planDefinition: PlanDefinition
  resolver: BrowserResolver
  nodes: Node[] | undefined
  edges: Edge[] | undefined
  constructor(planDefinition: fhir4.PlanDefinition, resolver: BrowserResolver, nodes?: Node[] | undefined, edges?: Edge[] | undefined) {
    this.planDefinition = planDefinition
    this.resolver = resolver
    this.nodes = nodes
    this.edges = edges
  }

  private addNewNode(node: Node) {
    this.nodes ? this.nodes.push(node) : (this.nodes = [node])
  }

  private addNewEdge(edge: Edge) {
    this.edges ? this.edges.push(edge) : (this.edges = [edge])
  }

  private createEndNode(
    resource: fhir4.ActivityDefinition | fhir4.Questionnaire | RequestResource
  ): Node {
    return {
      id: getNodeIdFromResource(resource),
      data: {
        label: getNodeLabelFromResource(resource),
        handle: ['target'],
        nodeContent: { resource },
        isExpandable: false,
        isSelected: false,
      },
      type: 'contentNode',
      position: { x: 0, y: 0 },
      className: 'node',
    } as Node
  }

  private createActionNode(
    id: string,
    action: fhir4.PlanDefinitionAction | fhir4.RequestGroupAction,
    resource: fhir4.PlanDefinition | fhir4.RequestGroup
  ) {
    const { title, id: actionId, description } = action
    return {
      id,
      data: {
        label: title ?? actionId ?? description,
        handle: ['target', 'source'],
        nodeContent: { resource: action, partOf: resource },
        isExpandable: false,
        isSelected: false,
      },
      type: 'contentNode',
      position: { x: 0, y: 0 },
      className: 'node',
    } as Node
  }

  private createApplicabilityNode(
    id: string,
    parentId: string,
    condition: fhir4.PlanDefinitionActionCondition,
    action: fhir4.PlanDefinitionAction | fhir4.RequestGroupAction,
    planDefinition: fhir4.PlanDefinition | fhir4.RequestGroup
  ) {
    const { expression, kind } = condition
    return {
      id,
      data: {
        label:
          expression != null
            ? expression.name ?? expression.expression ?? expression.description
            : kind,
        handle: ['target', 'source'],
        nodeContent: { resource: action, partOf: planDefinition },
        isExpandable: false,
        parentNodeId: parentId,
      },
      type: 'applicabilityNode',
      position: { x: 0, y: 0 },
      className: 'node',
    } as Node
  }

  private createStartNode(id: string, definition: fhir4.PlanDefinition | fhir4.RequestGroup) {
    return {
      id,
      data: {
        nodeContent: { resource: definition },
        isExpandable: false,
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
    selectionBehavior:
      | fhir4.PlanDefinitionAction['selectionBehavior']
      | undefined
  ) {
    const edge = this.createEdge(sourceId, targetId)
    if (selectionBehavior != null) {
      edge.animated = true
    }
    this.addNewEdge(edge)
  }

  /**
   * @param planDefinition Plan definition as source data
   * @param actions Plan definition actions to process as new nodes
   * @param resolver FHIR resolver
   * @param parent Parent node that will connect to new child node (used to create Edge)
   * @param parentSelection Selection behavior if any of the parent node (used to create Edge)
   */
  private processActionNodes(
    resource: fhir4.PlanDefinition | fhir4.RequestGroup,
    actions: fhir4.PlanDefinitionAction[] | fhir4.RequestGroupAction[],
    // resolver: BrowserResolver | fhir4.Bundle,
    parent: Node,
    parentSelection?:
      | fhir4.PlanDefinitionAction['selectionBehavior']
      | undefined,
    requestBundle?: fhir4.Bundle
  ) {
    actions?.map((action) => {
      const {
        title,
        id,
        condition,
        selectionBehavior,
        action: childActions,
      } = action
      const nodeId = `action-${title ?? id}-${v4()}`
      /**
       * Handle Applicability - becomes parent of current action node
       */
      let currentParent = parent
      if (condition != null) {
        condition.forEach((condition) => {
          const applicabilityNode = this.createApplicabilityNode(
            `condition-${nodeId}`,
            nodeId,
            condition,
            action,
            resource
          )
          this.addNewNode(applicabilityNode)
          this.connectNodes(
            currentParent.id,
            applicabilityNode.id,
            parentSelection
          )
          currentParent = applicabilityNode
        })
      }

      /**
       * Create action node
       */
      const node = this.createActionNode(nodeId, action, resource)

      /**
       * Handle children
       */
      if (is.PlanDefinitionAction(action) && action.definitionCanonical != null) {
        const definition = this.resolver.resolveCanonical(
          action.definitionCanonical
        ) as fhir4.PlanDefinition | fhir4.ActivityDefinition | undefined
        /** Process definition canonical = plan definition */
        if (is.PlanDefinition(definition) && definition.action != null) {
          this.processActionNodes(
            definition,
            definition.action,
            node,
            selectionBehavior
          )
          /** Process definition canonical = activity definition or questionnaire */
        } else if (
          is.ActivityDefinition(definition) ||
          is.Questionnaire(definition)
        ) {
          let endNode = this.nodes?.find((n) => n.id === id)
          if (endNode == null) {
            endNode = this.createEndNode(definition)
            this.addNewNode(endNode)
          }
          this.connectNodes(node.id, endNode.id, parentSelection)
        }
        /** Process child actions */
      } else if (!is.PlanDefinitionAction(action) && action.resource?.reference != null && requestBundle != null) {
        const [resourceType, id] = action.resource?.reference.split('/')
        const targetResource = requestBundle.entry?.find(e => e.resource?.resourceType === resourceType && e.resource?.id === id)?.resource
        if (is.RequestGroup(targetResource) && targetResource.action != null) {
          this.processActionNodes(
            targetResource,
            targetResource.action,
            node,
            selectionBehavior
          )
        } else if (is.RequestResource(targetResource)) {
          let endNode = this.nodes?.find((n) => n.id === id)
          if (endNode == null) {
            endNode = this.createEndNode(targetResource)
            this.addNewNode(endNode)
          }
          this.connectNodes(node.id, endNode.id, parentSelection)
        }
      } else if (childActions != null) {
        this.processActionNodes(
          resource,
          childActions,
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
  ) {
    const node = this.createStartNode('start', this.planDefinition)
    this.addNewNode(node)

    /** Handle children */
    if (this.planDefinition.action != null) {
      this.processActionNodes(
        this.planDefinition,
        this.planDefinition.action,
        node
      )
    } else {
      console.log('There are no plan definition actions to display')
    }

    return this
  }

  /**
   * Request Group overlay
   * Generate initial react flow
   * Generate request group
   * How to find corresponding request group node?
   *
   */
  public generateRequestGroupFlow(
    requestBundle: fhir4.Bundle,
    planDefinition: fhir4.PlanDefinition
  ) {
    this.nodes = []
    this.edges = []
    const requestGroup = requestBundle.entry?.find(
      (entry) => entry.resource?.resourceType === 'RequestGroup' && entry.resource?.instantiatesCanonical?.find(c => c.split('|').shift() === planDefinition.url?.split('|').shift())
    )?.resource as fhir4.RequestGroup | undefined
    if (is.RequestGroup(requestGroup)) {
      const node = this.createStartNode('start', requestGroup)
      this.addNewNode(node)

      /** Handle children */
      if (requestGroup.action != null) {
        this.processActionNodes(
          requestGroup,
          requestGroup.action,
          node,
          undefined,
          requestBundle,
        )
      } else {
        console.log('There are no request group actions to display')
      }
    }
    return this
  }

  /**
   * Generate final react flow with updated layout positions
   * @param nodeData React state setters to pass to nodes
   */
  public async positionNodes(
    nodeData?: Record<any, React.Dispatch<React.SetStateAction<any>>>
  ) {
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
                data: { ...reactNode.data, ...nodeData },
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

  /**
   *
   * @param parentNode
   * @param allNodes
   * @param allEdges
   * @returns
   */
  private getChildNodes(parentNode: Node, allNodes: Node[], allEdges: Edge[]) {
    const immediateOutgoers = getOutgoers(parentNode, allNodes, allEdges)
    const applicabilityOutgoers = immediateOutgoers
      .filter((node) => node.type === 'applicabilityNode')
      ?.flatMap((n) => getOutgoers(n, allNodes, allEdges))
      .filter((n) => n != null)
    return immediateOutgoers.concat(applicabilityOutgoers)
  }

  /**
   * @returns Updated, re-graphed flow with visible outgoers from the start node. Remaining nodes are hidden.
   */
  public async collapseAllChildren() {
    if (this.nodes != null && this.edges != null) {
      const startNode = this.nodes.find((n) => n.id === 'start')
      if (!startNode) {
        console.error('Unable to collapse graph')
      } else {
        const children = this.getChildNodes(startNode, this.nodes, this.edges)
        this.nodes = [
          startNode,
          ...children.map((c) => {
            return { ...c, data: { ...c.data, isExpandable: true } }
          }),
        ]
        this.edges = this.edges.filter(
          (edge) =>
            this.nodes?.find((node) => node.id === edge.target) &&
            this.nodes?.find((node) => node.id === edge.source)
        )
      }
    }
    await this.positionNodes()
    return this
  }

  /**
   *
   * @param sourceNode Node to expand from
   * @param allNodes All available nodes from initial Flow
   * @param allEdges All available edges from initial Flow
   * @returns Updated, re-graphed flow with visible outgoers from the expanded node and other previously visible nodes. Remaining nodes are hidden.
   */
  public async expandChild(
    sourceNode: Node,
    allNodes: Node[],
    allEdges: Edge[]
  ) {
    if (this.nodes != null && this.edges != null) {
      const children = this.getChildNodes(sourceNode, allNodes, allEdges)
      if (children != null) {
        this.nodes = [
          ...this.nodes.map((node) => {
            if (node.id === sourceNode.id) {
              node = { ...node, data: { ...node.data, isExpandable: false } }
            }
            return node
          }),
          ...children.map((childNode) => {
            return {
              ...childNode,
              data: { ...childNode.data, isExpandable: true },
            }
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
        this.edges = [...this.edges, ...childEdges]
      }
    }
    await this.positionNodes()
    return this
  }

  /**
   *
   * @param sourceId Node to center in flow
   * @param yAxis y-axis offset
   * @param zoomFactor
   * @param reactFlow
   */
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

  /**
   *
   * @param nodes All visible nodes
   * @param selectedNode Node to set as selected. If undefined, all nodes set to isSelected false.
   * @returns Nodes with updated node data
   */
  public static setSelectedNode(
    nodes: Node[],
    selectedNode?: string | undefined
  ) {
    return nodes.map((node) => {
      return {
        ...node,
        data: { ...node.data, isSelected: node.id === (selectedNode ?? false) },
      }
    })
  }
}

export default Flow
