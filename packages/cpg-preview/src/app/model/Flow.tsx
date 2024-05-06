import { Edge, Node, StraightEdge } from 'reactflow'
import { is, notEmpty } from '../helpers'
import '@/styles/node.css'
import '@/styles/edge.css'
import FileResolver from 'resolver/file'
import { ElkNode } from 'elkjs'
import { resolveCanonical } from '../helpers'
import { v4 } from 'uuid'

class Flow {
  nodes: Node[] | undefined
  edges: Edge[] | undefined

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
        id,
        label: definition.title ?? definition.id,
        details: definition,
      },
      type: 'definitionNode',
      position: { x: 0, y: 0 },
      className: 'definition-node node',
    } as Node
  }

  private createActionNode(id: string, action: fhir4.PlanDefinitionAction) {
    return {
      id,
      data: { id, label: action.title, details: action },
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
  private async processDefinitionalNode(
    definition: fhir4.ActivityDefinition | fhir4.PlanDefinition | undefined,
    content: FileResolver,
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
        node.type = 'input'
      }

      /** Handle children */
      if (is.planDefinition(definition) && definition.action) {
        const targetEdge = this.createEdge(node.id)
        if (!match) {
          await this.processActionNodes(definition.action, content, targetEdge)
        }
      } else {
        node.type = 'output'
      }
    }
  }

  /**
   *
   * @param actions Plan definition actions to process as new node
   * @param content FHIR content
   * @param parentEdge Edge with source information
   */
  private async processActionNodes(
    actions: fhir4.PlanDefinitionAction[],
    content: FileResolver,
    parentEdge: Edge
  ) {
    await Promise.all(
      actions.map(async (action) => {
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
          const definition = (await resolveCanonical(
            action.definitionCanonical,
            content
          )) as fhir4.ActivityDefinition | fhir4.PlanDefinition | undefined
          if (definition) {
            await this.processDefinitionalNode(
              definition,
              content,
              targetEdge
            )
          }
        } else if (action.action) {
          await this.processActionNodes(
            action.action,
            content,
            targetEdge
          )
        }
        if (!action.definitionCanonical && !action.action) {
          actionNode.data.handle = 'output'
        }
      })
    )
  }

  /**
   * Generate initial react flow from plan definition without layout (all positions are y:0 and x:0)
   * @param planDefinition
   * @param content
   * @returns
   */
  public async generateInitialFlow(
    planDefinition: fhir4.PlanDefinition,
    content: FileResolver
  ) {
    await this.processDefinitionalNode(planDefinition, content)
    return this
  }

  /**
   * Generate final react flow with updated layout positions
   * @param graph
   */
  public generateFinalFlow(graph: ElkNode) {
    if (this.nodes && this.edges) {
      this.nodes = graph.children
        ?.map((node) => {
          const reactNode = this.nodes?.find((n) => n.id === node.id)
          if (node.x && node.y && reactNode) {
            return {
              ...reactNode,
              position: { x: node.x, y: node.y },
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
  }
}

export default Flow
