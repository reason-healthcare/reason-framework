import { render } from '@testing-library/react'
import '../../jest-setup/matchMedia'
import FlowDisplay from 'components/flow-display/FlowDisplay'
import { FlowDisplayProps } from 'components/flow-display/FlowDisplay'
import simplePlanDefinition from './test-data/simplePlanDefinition.json'
import resolverData from './test-data/resolverData.json'
import BrowserResolver from 'resolver/browser'
import jest from 'jest-mock'
import { ReactFlowProvider, useStore } from 'reactflow'
import React from 'react'


const props: FlowDisplayProps = {
  resolver: new BrowserResolver(JSON.stringify(resolverData)) as BrowserResolver,
  planDefinition: simplePlanDefinition as fhir4.PlanDefinition,
  setNodeData: jest.fn(),
  selectedNode: undefined,
  setSelectedNode: jest.fn()
}

// TODO: nodes and edges are not rendering ??
describe("Flow Display", () => {
  it('Renders graph with simple plan definition', () => {
    const { asFragment } = render(
      <ReactFlowProvider>
        <FlowDisplay {...props}/>
      </ReactFlowProvider>
    )
    expect(asFragment()).toMatchSnapshot()
  })
})