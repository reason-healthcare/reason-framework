import { Edge, Node, ReactFlowInstance, getOutgoers } from 'reactflow'
import {
  is,
  notEmpty,
  RequestResource,
  getNodeLabelFromResource,
  getNodeIdFromResource,
} from '../helpers'
import '@/styles/node.css'
import { v4 } from 'uuid'
import Graph from './Graph'
import BrowserResolver from 'resolver/browser'
import {
  PlanDefinition,
  PlanDefinitionAction,
  RequestGroupAction,
} from 'fhir/r4'
import { generateActionHash, buildActionHashMap, canMatchAllRQActions } from './actionHash'

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
  constructor(
    planDefinition: fhir4.PlanDefinition,
    resolver: BrowserResolver,
    nodes?: Node[] | undefined,
    edges?: Edge[] | undefined
  ) {
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
    resource: fhir4.ActivityDefinition | fhir4.Questionnaire | RequestResource,
    inactive: boolean
  ): Node {
    return {
      id: getNodeIdFromResource(resource),
      data: {
        label: getNodeLabelFromResource(resource),
        handle: ['target'],
        nodeContent: { resource },
        isExpandable: false,
        isSelected: false,
        inactive,
      },
      type: 'contentNode',
      position: { x: 0, y: 0 },
      className: 'node',
    } as Node
  }

  private createActionNode(
    id: string,
    action: fhir4.PlanDefinitionAction | fhir4.RequestGroupAction,
    resource: fhir4.PlanDefinition | fhir4.RequestGroup,
    inactive: boolean
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
        inactive,
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
    planDefinition: fhir4.PlanDefinition | fhir4.RequestGroup,
    inactive: boolean
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
        inactive,
      },
      type: 'applicabilityNode',
      position: { x: 0, y: 0 },
      className: 'node',
    } as Node
  }

  private createStartNode(
    id: string,
    definition: fhir4.PlanDefinition | fhir4.RequestGroup
  ) {
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

  private createEdge(
    sourceId: string,
    targetId: string,
    inactive: boolean,
    recommended: boolean
  ) {
    const edge = {
      id: `${sourceId} - ${targetId}`,
      data: {
        inactive,
      },
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
      | undefined,
    inactive: boolean,
    recommended: boolean
  ) {
    const edge = this.createEdge(sourceId, targetId, inactive, recommended)
    if (selectionBehavior != null || recommended) {
      edge.animated = true
    }
    if (recommended) {
      edge.style = { stroke: 'var(--brTeal)', strokeWidth: '2px' }
    }
    this.addNewEdge(edge)
  }

  /**
   * Finds a matching RequestGroup action using hash-based matching.
   * Uses action title, description, id (if present), and parent path for uniqueness.
   * @param rqActionHashMap Pre-built map of action hashes to RequestGroup actions
   * @param pdAction The PlanDefinition action to find a match for
   * @param parentPath Array of parent action hashes forming the path to this action
   */
  private findMatchingRQActionByHash(
    rqActionHashMap: Map<string, RequestGroupAction>,
    pdAction: PlanDefinitionAction,
    parentPath: string[] = []
  ): RequestGroupAction | undefined {
    const hash = generateActionHash(pdAction, parentPath)
    return rqActionHashMap.get(hash)
  }

  /**
   * @param planDefinition Plan definition as source data
   * @param actions Plan definition actions to process as new nodes
   * @param resolver FHIR resolver
   * @param parent Parent node that will connect to new child node (used to create Edge)
   * @param parentSelection Selection behavior if any of the parent node (used to create Edge)
   * @param requestBundle The request bundle containing RequestGroup resources
   * @param rqActionHashMap Pre-built map of action hashes to RequestGroup actions
   * @param parentPath Array of parent action hashes for uniqueness
   */
  private processActionNodes(
    planDefinition: fhir4.PlanDefinition,
    actions: fhir4.PlanDefinitionAction[],
    // resolver: BrowserResolver | fhir4.Bundle,
    parent: Node,
    requestGroup?: fhir4.PlanDefinition | fhir4.RequestGroup,
    parentSelection?:
      | fhir4.PlanDefinitionAction['selectionBehavior']
      | undefined,
    requestBundle?: fhir4.Bundle | undefined,
    rqActionHashMap?: Map<string, RequestGroupAction>,
    parentPath: string[] = []
  ) {
    actions?.map((action) => {
      // Generate hash for current PD action
      const actionHash = generateActionHash(action, parentPath)
      const currentPath = [...parentPath, actionHash]

      // Find matching RQ action using hash-based matching
      const requestGroupAction = rqActionHashMap
        ? this.findMatchingRQActionByHash(rqActionHashMap, action, parentPath)
        : undefined
      const targetAction = requestGroupAction ?? action
      const targetResource =
        requestGroupAction != null && requestGroup
          ? requestGroup
          : planDefinition

      // If building a request group and there is no matching action found, render the PD action as inactive
      const inactive = requestGroup != null && !requestGroupAction
      const recommended = requestGroup != null && requestGroupAction != null

      const childActions = action.action

      const { title, id, condition, selectionBehavior } = targetAction
      const nodeId = `action-${title ?? id}-${v4()}`
      /**
       * Handle Applicability - becomes parent of current action node
       */
      let currentParent = parent
      if (condition != null) {
        condition.forEach((c: any) => {
          const applicabilityNode = this.createApplicabilityNode(
            `condition-${nodeId}-${c.expression.expression}`,
            nodeId,
            c,
            targetAction,
            targetResource,
            inactive
          )
          this.addNewNode(applicabilityNode)
          this.connectNodes(
            currentParent.id,
            applicabilityNode.id,
            parentSelection,
            inactive,
            recommended
          )
          currentParent = applicabilityNode
        })
      }
      /**
       * Create action node
       */
      const node = this.createActionNode(
        nodeId,
        targetAction,
        targetResource,
        inactive
      )

      /**
       * Handle children
       */
      if (
        is.PlanDefinitionAction(targetAction) &&
        !requestGroupAction &&
        targetAction.definitionCanonical != null
      ) {
        const definition = this.resolver.resolveCanonical(
          targetAction.definitionCanonical
        ) as fhir4.PlanDefinition | fhir4.ActivityDefinition | undefined
        /** Process definition canonical = plan definition */
        if (is.PlanDefinition(definition) && definition.action != null) {
          this.processActionNodes(
            definition,
            definition.action,
            node,
            requestGroup,
            selectionBehavior,
            requestBundle,
            rqActionHashMap,
            currentPath
          )
          /** Process definition canonical = activity definition or questionnaire */
        } else if (
          is.ActivityDefinition(definition) ||
          is.Questionnaire(definition)
        ) {
          let endNode = this.nodes?.find((n) => n.id === id)
          if (endNode == null) {
            endNode = this.createEndNode(definition, inactive)
            this.addNewNode(endNode)
          }
          this.connectNodes(
            node.id,
            endNode.id,
            parentSelection,
            inactive,
            recommended
          )
        }
        /** Process child actions */
      } else if (
        is.RequestGroupAction(targetAction) &&
        requestGroupAction &&
        targetAction.resource?.reference != null &&
        requestBundle != null &&
        action.definitionCanonical != null
      ) {
        const id = targetAction.resource?.reference.split('/')?.pop()
        const requestTarget = requestBundle.entry?.find(
          (e) => e.resource?.id === id
        )?.resource
        const targetPlan = this.resolver.resolveCanonical(
          action.definitionCanonical
        ) as fhir4.PlanDefinition | undefined
        if (
          is.RequestGroup(requestTarget) &&
          is.PlanDefinition(targetPlan) &&
          targetPlan.action != null
        ) {
          // Build new hash map for nested RequestGroup
          const nestedRQHashMap = buildActionHashMap(requestTarget.action)
          this.processActionNodes(
            targetPlan,
            targetPlan.action,
            node,
            requestTarget,
            selectionBehavior,
            requestBundle,
            nestedRQHashMap,
            [] // Reset path for nested request group
          )
        } else if (is.RequestResource(requestTarget)) {
          let endNode = this.nodes?.find((n) => n.id === id)
          if (endNode == null) {
            endNode = this.createEndNode(requestTarget, inactive)
            this.addNewNode(endNode)
          }
          this.connectNodes(
            node.id,
            endNode.id,
            parentSelection,
            inactive,
            recommended
          )
        }
      } else if (childActions != null) {
        this.processActionNodes(
          planDefinition,
          childActions,
          node,
          requestGroup,
          selectionBehavior,
          requestBundle,
          rqActionHashMap,
          currentPath
        )
      } else {
        /** Where there are no child nodes, the final node should be of type 'target'  */
        node.data.handle = ['target']
      }
      this.addNewNode(node)
      this.connectNodes(
        currentParent.id,
        node.id,
        parentSelection,
        inactive,
        recommended
      )
    })
  }

  /**
   * Process RequestGroup actions directly without PlanDefinition matching.
   * Used as fallback when RQ actions cannot be matched to PD actions.
   * @param requestGroup The RequestGroup resource
   * @param actions RequestGroup actions to process
   * @param parent Parent node
   * @param requestBundle The request bundle containing nested resources
   * @param parentSelection Selection behavior of parent
   */
  private processRQActionsOnly(
    requestGroup: fhir4.RequestGroup,
    actions: fhir4.RequestGroupAction[],
    parent: Node,
    requestBundle: fhir4.Bundle,
    parentSelection?: fhir4.RequestGroupAction['selectionBehavior']
  ) {
    actions?.forEach((action) => {
      const { title, id, condition, selectionBehavior } = action
      const nodeId = `action-${title ?? id}-${v4()}`

      // Handle Applicability conditions
      let currentParent = parent
      if (condition != null) {
        condition.forEach((c: any) => {
          const applicabilityNode = this.createApplicabilityNode(
            `condition-${nodeId}-${c.expression?.expression ?? c.kind}`,
            nodeId,
            c as fhir4.PlanDefinitionActionCondition,
            action,
            requestGroup,
            false
          )
          this.addNewNode(applicabilityNode)
          this.connectNodes(currentParent.id, applicabilityNode.id, parentSelection, false, true)
          currentParent = applicabilityNode
        })
      }

      // Create action node
      const node = this.createActionNode(nodeId, action, requestGroup, false)

      // Handle children - either nested actions or resource references
      if (action.action && action.action.length > 0) {
        // Nested actions
        this.processRQActionsOnly(
          requestGroup,
          action.action as fhir4.RequestGroupAction[],
          node,
          requestBundle,
          selectionBehavior
        )
      } else if (action.resource?.reference) {
        // Resource reference - could be nested RequestGroup or end resource
        const resourceId = action.resource.reference.split('/').pop()
        const resourceType = action.resource.reference.split('/').shift()
        const referencedResource = requestBundle.entry?.find(
          (e) => e.resource?.id === resourceId
        )?.resource

        if (is.RequestGroup(referencedResource) && referencedResource.action) {
          // Nested RequestGroup - process its actions
          this.processRQActionsOnly(
            referencedResource,
            referencedResource.action,
            node,
            requestBundle,
            selectionBehavior
          )
        } else if (is.RequestResource(referencedResource)) {
          // End resource (MedicationRequest, ServiceRequest, etc.)
          let endNode = this.nodes?.find((n) => n.id === resourceId)
          if (endNode == null) {
            endNode = this.createEndNode(referencedResource, false)
            this.addNewNode(endNode)
          }
          this.connectNodes(node.id, endNode.id, parentSelection, false, true)
        }
      } else {
        // No children - this is a leaf node
        node.data.handle = ['target']
      }

      this.addNewNode(node)
      this.connectNodes(currentParent.id, node.id, parentSelection, false, true)
    })
  }

  /**
   * Generate initial react flow from plan definition without layout (all positions are y:0 and x:0)
   * @param planDefinition
   * @param resolver
   * @returns
   */
  public generateInitialFlow() {
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
   * Attempts to match RQ actions to PD actions using hash-based matching.
   * If matching fails for any RQ action, falls back to displaying only RQ actions.
   */
  public generateRequestGroupFlow(
    requestBundle: fhir4.Bundle,
    planDefinition: fhir4.PlanDefinition
  ) {
    this.nodes = []
    this.edges = []
    const requestGroup = requestBundle.entry?.find(
      (entry) =>
        entry.resource?.resourceType === 'RequestGroup' &&
        entry.resource?.instantiatesCanonical?.find(
          (c) => c.split('|').shift() === planDefinition.url?.split('|').shift()
        )
    )?.resource as fhir4.RequestGroup | undefined

    if (is.RequestGroup(requestGroup)) {
      const node = this.createStartNode('start', requestGroup)
      this.addNewNode(node)

      // Build hash maps for both PD and RQ actions
      const rqActionHashMap = buildActionHashMap(requestGroup.action)
      const pdActionHashMap = buildActionHashMap(planDefinition.action)

      // Check if all RQ actions can be matched to PD actions
      const canMatch = canMatchAllRQActions(
        requestGroup.action,
        pdActionHashMap,
        []
      )

      if (canMatch && planDefinition.action != null) {
        // All RQ actions match - use combined PD+RQ flow
        this.processActionNodes(
          planDefinition,
          planDefinition.action,
          node,
          requestGroup,
          undefined,
          requestBundle,
          rqActionHashMap,
          []
        )
      } else if (requestGroup.action != null) {
        // Matching failed - fall back to RQ-only flow
        console.warn(
          'Could not match all RequestGroup actions to PlanDefinition actions. Displaying RequestGroup actions only.'
        )
        this.processRQActionsOnly(
          requestGroup,
          requestGroup.action,
          node,
          requestBundle,
          undefined
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
