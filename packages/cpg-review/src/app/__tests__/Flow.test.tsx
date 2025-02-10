import Flow from 'graph/Flow'
import simplePlanDefinition from './test-data/simplePlanDefinition.json'
import nodesExpected from './test-data/nodesExpected.json'
import resolverData from './test-data/resolverData.json'
import BrowserResolver from 'resolver/browser'

const planDefinition = simplePlanDefinition as fhir4.PlanDefinition
const resolver = new BrowserResolver(JSON.stringify(resolverData))

const normalizeNodes = (nodes: any) => {
  return nodes?.map((node: any) => {
    delete node.id
    return node
  })
}

test('Generates all initial nodes as expected', async () => {
  const flow = new Flow().generateInitialFlow(planDefinition, resolver)
  const finalFlow = await flow.generateFinalFlow()
  expect(normalizeNodes(finalFlow.nodes)).toEqual(normalizeNodes(nodesExpected.nodes))
})

test('Generates an edge for each node', async () => {
  const flow = new Flow().generateInitialFlow(planDefinition, resolver)
  const finalFlow = await flow.generateFinalFlow()
  const {nodes, edges} = finalFlow
  nodes?.forEach((node) => {
    const isConnectedNode = edges?.some((edge) => node.id === edge.target || node.id === edge.source)
    expect(isConnectedNode).toBe(true)
  })
})
