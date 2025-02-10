import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../../jest-setup/matchMedia'
import '@testing-library/jest-dom'
import NarrativeDisplay from 'components/narrative-display/NarrativeDisplay'
import { NarrativeDisplayProps } from 'components/narrative-display/NarrativeDisplay'
import expectedNodes from './test-data/nodesExpected.json'
import resolverData from './test-data/resolverData.json'
import BrowserResolver from 'resolver/browser'
import React from 'react'
import {BrowserRouter} from 'react-router-dom'
import jest from 'jest-mock'

const node = expectedNodes.nodes.find(node => node.data.nodeData.nodeDetails.title === 'Order monitoring tests for antirheumatic drug therapy (Methotrexate).' && node.type === 'contentNode')
const props: NarrativeDisplayProps = {
  resolver: new BrowserResolver(JSON.stringify(resolverData)) as BrowserResolver,
  setSelectedNode: jest.fn(),
  nodeDetails: JSON.parse(JSON.stringify(node?.data.nodeData))
}

test('Renders display panel with PD action details as formatted text', () => {
    const { asFragment } = render(
      <BrowserRouter>
        <NarrativeDisplay {...props}/>
      </BrowserRouter>
    )
    expect(asFragment()).toMatchSnapshot()
  })

test('Renders action details as JSON on toggle', async() => {
  const user = userEvent.setup()

  const { asFragment } = render(
    <BrowserRouter>
      <NarrativeDisplay {...props}/>
    </BrowserRouter>
  )

  await user.click(screen.getByText('JSON'))
  expect(asFragment()).toMatchSnapshot()
})