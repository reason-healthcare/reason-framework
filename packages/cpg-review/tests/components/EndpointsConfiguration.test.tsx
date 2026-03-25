import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EndpointsConfiguration, {
  EndpointsConfigurationHandle,
} from 'components/apply-form/EndpointsConfiguration'

const DEFAULTS = {
  cpgEngineEndpoint: 'http://localhost:8080/fhir/PlanDefinition/$r5.apply',
  contentEndpoint: 'http://localhost:8080/fhir',
  txEndpoint: 'http://localhost:8080/fhir',
  dataEndpoint: 'http://localhost:8080/fhir',
}

function makeProps(overrides = {}) {
  return {
    onCpgEngineEndpointChange: jest.fn(),
    onContentEndpointChange: jest.fn(),
    onTxEndpointChange: jest.fn(),
    onDataEndpointChange: jest.fn(),
    ...overrides,
  }
}

describe('EndpointsConfiguration', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  // 5.2 – collapsed on initial render
  it('is collapsed on initial render (URL inputs not visible)', () => {
    render(<EndpointsConfiguration {...makeProps()} />)
    // Inputs are inside the collapsed panel — antd hides them via display:none
    const dataInput = screen.queryByPlaceholderText('http://localhost:8080/fhir')
    // Either not in DOM or not visible
    if (dataInput) {
      expect(dataInput).not.toBeVisible()
    } else {
      expect(dataInput).toBeNull()
    }
  })

  // 5.3 – clicking header expands
  it('expands to reveal URL inputs when the header is clicked', async () => {
    render(<EndpointsConfiguration {...makeProps()} />)
    await userEvent.click(screen.getByText('Endpoints Configuration'))
    // After expansion the Data Endpoint heading should be visible
    await waitFor(() =>
      expect(screen.getByText('Data Endpoint')).toBeVisible()
    )
  })

  // 5.4 – collapsed summary shows data endpoint URL
  it('collapsed summary displays the current Data endpoint URL', () => {
    render(<EndpointsConfiguration {...makeProps()} />)
    expect(
      screen.getByText(`Data: ${DEFAULTS.dataEndpoint}`)
    ).toBeInTheDocument()
  })

  // 5.5 – summary updates after URL change
  it('collapsed summary updates after a URL is changed and section is collapsed', async () => {
    render(<EndpointsConfiguration {...makeProps()} />)
    // Expand
    await userEvent.click(screen.getByText('Endpoints Configuration'))
    await waitFor(() => expect(screen.getByText('Data Endpoint')).toBeVisible())

    // Clear and type new URL into Data Endpoint input
    const inputs = screen.getAllByPlaceholderText('http://localhost:8080/fhir')
    const dataInput = inputs[0] // first is Data Endpoint
    await userEvent.clear(dataInput)
    await userEvent.type(dataInput, 'http://new-server/fhir')

    // Collapse
    await userEvent.click(screen.getByText('Endpoints Configuration'))

    // Summary should now show the new URL
    await waitFor(() =>
      expect(screen.getByText('Data: http://new-server/fhir')).toBeInTheDocument()
    )
  })

  // 5.6 – reads initial values from localStorage
  it('reads initial values from localStorage on mount', async () => {
    const stored = {
      ...DEFAULTS,
      dataEndpoint: 'http://stored-server/fhir',
      cpgEngineEndpoint: 'http://stored-engine/fhir/PlanDefinition/$r5.apply',
    }
    localStorage.setItem('endpointsConfig', JSON.stringify(stored))

    render(<EndpointsConfiguration {...makeProps()} />)

    // Expand to see inputs
    await userEvent.click(screen.getByText('Endpoints Configuration'))
    await waitFor(() => expect(screen.getByText('Data Endpoint')).toBeVisible())

    expect(
      screen.getByDisplayValue('http://stored-server/fhir')
    ).toBeInTheDocument()
    expect(
      screen.getByDisplayValue(
        'http://stored-engine/fhir/PlanDefinition/$r5.apply'
      )
    ).toBeInTheDocument()
  })

  // 5.7 – localStorage updated on input change
  it('updates localStorage when a URL input changes', async () => {
    render(<EndpointsConfiguration {...makeProps()} />)
    await userEvent.click(screen.getByText('Endpoints Configuration'))
    await waitFor(() => expect(screen.getByText('Data Endpoint')).toBeVisible())

    const inputs = screen.getAllByPlaceholderText('http://localhost:8080/fhir')
    await userEvent.clear(inputs[0])
    await userEvent.type(inputs[0], 'http://updated/fhir')

    const stored = JSON.parse(localStorage.getItem('endpointsConfig')!)
    expect(stored.dataEndpoint).toBe('http://updated/fhir')
  })

  // 5.8 – default values when no localStorage entry
  it('shows default values when no localStorage entry exists', async () => {
    render(<EndpointsConfiguration {...makeProps()} />)
    await userEvent.click(screen.getByText('Endpoints Configuration'))
    await waitFor(() => expect(screen.getByText('Data Endpoint')).toBeVisible())

    expect(
      screen.getAllByDisplayValue('http://localhost:8080/fhir').length
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByDisplayValue(DEFAULTS.cpgEngineEndpoint)
    ).toBeInTheDocument()
  })

  // 5.9 – onChange callback called on input change
  it('calls onDataEndpointChange when the Data Endpoint input changes', async () => {
    const onDataEndpointChange = jest.fn()
    render(
      <EndpointsConfiguration
        {...makeProps({ onDataEndpointChange })}
      />
    )
    await userEvent.click(screen.getByText('Endpoints Configuration'))
    await waitFor(() => expect(screen.getByText('Data Endpoint')).toBeVisible())

    const inputs = screen.getAllByPlaceholderText('http://localhost:8080/fhir')
    await userEvent.clear(inputs[0])
    await userEvent.type(inputs[0], 'http://callback-test/fhir')

    expect(onDataEndpointChange).toHaveBeenCalledWith(
      expect.stringContaining('http://callback-test/fhir')
    )
  })

  // reset via ref
  it('reset() clears localStorage and restores default values', async () => {
    const ref = React.createRef<EndpointsConfigurationHandle>()
    const onDataEndpointChange = jest.fn()
    render(
      <EndpointsConfiguration
        {...makeProps({ onDataEndpointChange })}
        ref={ref}
      />
    )

    // Manually set a non-default value in localStorage
    localStorage.setItem(
      'endpointsConfig',
      JSON.stringify({ ...DEFAULTS, dataEndpoint: 'http://custom/fhir' })
    )

    // Call reset
    act(() => {
      ref.current!.reset()
    })

    expect(localStorage.getItem('endpointsConfig')).toBeNull()
    expect(onDataEndpointChange).toHaveBeenCalledWith(DEFAULTS.dataEndpoint)
  })
})
