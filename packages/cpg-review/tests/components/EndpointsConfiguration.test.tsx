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
    onDataEndpointChange: jest.fn(),
    ...overrides,
  }
}

describe('EndpointsConfiguration', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  function getConfigHeaderButton() {
    return screen.getByRole('button', {
      name: /fhir endpoints configuration/i,
    })
  }

  it('is collapsed on initial render when endpoint config is complete', () => {
    render(<EndpointsConfiguration {...makeProps()} />)
    const dataInput = screen.queryByPlaceholderText(
      'http://localhost:8080/fhir'
    )
    if (dataInput) {
      expect(dataInput).not.toBeVisible()
    } else {
      expect(dataInput).toBeNull()
    }
  })

  it('is expanded on initial render when endpoint config is incomplete', async () => {
    localStorage.setItem(
      'endpointsConfig',
      JSON.stringify({
        ...DEFAULTS,
        txEndpoint: '',
      })
    )

    render(<EndpointsConfiguration {...makeProps()} />)

    await waitFor(() => expect(screen.getByText('Data Endpoint')).toBeVisible())
  })

  // 5.3 – clicking header expands
  it('expands to reveal URL inputs when the header is clicked', async () => {
    render(<EndpointsConfiguration {...makeProps()} />)
    await userEvent.click(getConfigHeaderButton())
    // After expansion the Data Endpoint heading should be visible
    await waitFor(() => expect(screen.getByText('Data Endpoint')).toBeVisible())
  })

  it('does not show endpoint preview values in collapsed header', () => {
    render(<EndpointsConfiguration {...makeProps()} />)

    expect(screen.queryByText(DEFAULTS.cpgEngineEndpoint)).toBeNull()
    expect(screen.queryByText(DEFAULTS.contentEndpoint)).toBeNull()
    expect(screen.queryByText(DEFAULTS.txEndpoint)).toBeNull()
    expect(screen.queryByText(DEFAULTS.dataEndpoint)).toBeNull()
  })

  it('remains collapsed on initial render when localStorage has complete endpoint config', () => {
    localStorage.setItem(
      'endpointsConfig',
      JSON.stringify({
        cpgEngineEndpoint:
          'http://complete-engine/fhir/PlanDefinition/$r5.apply',
        contentEndpoint: 'http://complete-content/fhir',
        txEndpoint: 'http://complete-tx/fhir',
        dataEndpoint: 'http://complete-data/fhir',
      })
    )

    render(<EndpointsConfiguration {...makeProps()} />)

    const dataInput = screen.queryByPlaceholderText(
      'http://localhost:8080/fhir'
    )
    if (dataInput) {
      expect(dataInput).not.toBeVisible()
    } else {
      expect(dataInput).toBeNull()
    }
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
    await userEvent.click(getConfigHeaderButton())
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
    await userEvent.click(getConfigHeaderButton())
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
    await userEvent.click(getConfigHeaderButton())
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
    render(<EndpointsConfiguration {...makeProps({ onDataEndpointChange })} />)
    await userEvent.click(getConfigHeaderButton())
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
