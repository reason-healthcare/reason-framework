import Flow from 'graph/Flow'
import simplePlanDefinition from './test-data/simplePlanDefinition.json'
import nodesExpected from './test-data/nodesExpected.json'
import resolverData from './test-data/resolverData.json'
import BrowserResolver from 'resolver/browser'
import exp from 'constants'

const normalizeNodes = (nodes: any) => {
  return nodes?.map((node: any) => {
    delete node.id
    return node
  })
}

const planDefinition = simplePlanDefinition as fhir4.PlanDefinition
const resolver = new BrowserResolver(JSON.stringify(resolverData))

test('Generates all initial nodes as expected', async () => {
  const flow = await new Flow()
    .generateInitialFlow(planDefinition, resolver)
    .generateFinalFlow()
  expect(normalizeNodes(flow.nodes)).toEqual(
    normalizeNodes(nodesExpected.nodes)
  )
})

test('Generates an edge for each node', async () => {
  const flow = await new Flow()
    .generateInitialFlow(planDefinition, resolver)
    .generateFinalFlow()
  const { nodes, edges } = flow
  nodes?.forEach((node) => {
    const isConnectedNode = edges?.some(
      (edge) => node.id === edge.target || node.id === edge.source
    )
    expect(isConnectedNode).toBe(true)
  })
})

test('Correctly sets display nodes and edges when graph is collapsed', async () => {
  const flow = await new Flow()
    .generateInitialFlow(planDefinition, resolver)
    .generateFinalFlow()
  await flow.collapseAllFromSource(planDefinition.id ?? '')

  const { nodes, edges } = flow
  const expectedNodesLength = 4
  const expectedEdgesLength = 3

  expect(nodes?.length).toBe(expectedNodesLength)
  expect(edges?.length).toBe(expectedEdgesLength)
  nodes?.forEach((node) => {
    const isConnectedNode = edges?.some(
      (edge) => node.id === edge.target || node.id === edge.source
    )
    expect(isConnectedNode).toBe(true)
  })
})

test('Correctly sets display nodes when a node expands', async () => {
  const flow = await new Flow()
    .generateInitialFlow(planDefinition, resolver)
    .generateFinalFlow()
  const originalNodes = [...(flow.nodes ?? [])]
  const originalEdges = [...(flow.edges ?? [])]
  await flow.collapseAllFromSource(planDefinition.id ?? '')
  // ID is unique, find by action title
  const sourceNode = flow.nodes?.find(
    (n) => n.data.nodeData.nodeDetails.title === 'Monitoring of treatment'
  )
  await flow.expandChildren(sourceNode, originalNodes, originalEdges)

  const { nodes, edges } = flow
  const expectedNodesLength = 5
  const expectedEdgesLength = 4
  const expandedNode = flow.nodes?.find(
    (n) => n.data.nodeData.nodeDetails.title === 'Monitoring of treatment'
  )

  expect(nodes?.length).toBe(expectedNodesLength)
  expect(edges?.length).toBe(expectedEdgesLength)
  expect(expandedNode?.data.isCollapsed).toBe(false)
  nodes?.forEach((node) => {
    const isConnectedNode = edges?.some(
      (edge) => node.id === edge.target || node.id === edge.source
    )
    expect(isConnectedNode).toBe(true)
  })
})
