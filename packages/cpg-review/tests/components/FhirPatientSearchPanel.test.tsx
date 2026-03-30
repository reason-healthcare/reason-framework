import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FhirPatientSearchPanel from 'components/apply-form/FhirPatientSearchPanel'

// ── Lightweight antd Select mock ──────────────────────────────────────────────
// Real antd Select uses Popper / createPortal which breaks in jsdom. This stub
// renders a plain input + option list that drives the same onSearch / onChange
// callbacks the component depends on.
jest.mock('antd', () => {
  const actual = jest.requireActual('antd')
  const MockSelect = ({
    onSearch,
    onChange,
    options,
    notFoundContent,
    placeholder,
    loading,
    ...rest
  }: any) => {
    const [inputValue, setInputValue] = React.useState('')
    return (
      <div>
        <input
          aria-label={rest['aria-label'] ?? placeholder}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            onSearch?.(e.target.value)
          }}
        />
        {loading && <span data-testid="select-loading">Searching…</span>}
        {options && options.length > 0 ? (
          <ul role="listbox">
            {options.map((opt: any) => (
              <li
                key={opt.value}
                role="option"
                onClick={() => onChange?.(opt.value)}
                aria-selected={false}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        ) : (
          notFoundContent && (
            <div data-testid="not-found-content">{notFoundContent}</div>
          )
        )}
      </div>
    )
  }
  MockSelect.Option = ({ children }: any) => <>{children}</>
  return { ...actual, Select: MockSelect }
})

// ── Module mocks ──────────────────────────────────────────────────────────────
jest.mock('utils/fhirClient', () => ({ fhirClient: jest.fn() }))
jest.mock('utils/recentPatientsStore', () => ({
  addPatient: jest.fn(),
  renderPatientName: jest.fn((names: any[]) => {
    if (!names?.length) return 'Unknown'
    const { given = [], family = '' } = names[0]
    return [...given, family].filter(Boolean).join(' ')
  }),
}))

import { fhirClient } from 'utils/fhirClient'
import { addPatient } from 'utils/recentPatientsStore'

const mockFhirClient = fhirClient as jest.MockedFunction<typeof fhirClient>

const ENDPOINT = 'http://fhir.example.com/fhir'

function makeBundle(patients: fhir4.Patient[]): fhir4.Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: patients.map((p) => ({ resource: p })),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('FhirPatientSearchPanel', () => {
  const onPatientSelect = jest.fn()

  // userEvent v14 must be configured with advanceTimers so it cooperates with
  // jest's fake timer implementation.
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  /** Type into the search input and flush the debounce timer. */
  async function typeAndSearch(value: string) {
    const input = screen.getByPlaceholderText(/search patients/i)
    await user.clear(input)
    await user.type(input, value)
    await act(async () => { jest.runAllTimers() })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  it('renders the search dropdown input', () => {
    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    expect(screen.getByPlaceholderText(/search patients/i)).toBeInTheDocument()
  })

  // ── Empty query ─────────────────────────────────────────────────────────────
  it('does not fire a request when query is empty', async () => {
    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    const input = screen.getByPlaceholderText(/search patients/i)
    await user.clear(input)
    await act(async () => { jest.runAllTimers() })
    expect(mockFhirClient).not.toHaveBeenCalled()
    expect(screen.getByTestId('not-found-content')).toHaveTextContent(/type to search/i)
  })

  // ── Successful search ───────────────────────────────────────────────────────
  it('populates dropdown options on a successful search', async () => {
    const patient: fhir4.Patient = {
      resourceType: 'Patient',
      id: 'pt1',
      name: [{ given: ['Jane'], family: 'Smith' }],
      birthDate: '1990-05-20',
      gender: 'female',
    }
    mockFhirClient.mockResolvedValue({ ok: true, data: makeBundle([patient]) } as any)

    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    await typeAndSearch('Smith')

    expect(mockFhirClient).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({ path: '/Patient', params: { name: 'Smith' } }),
    )
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
  })

  // ── Empty results ───────────────────────────────────────────────────────────
  it('shows "No patients found" when bundle is empty', async () => {
    mockFhirClient.mockResolvedValue({ ok: true, data: makeBundle([]) } as any)

    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    await typeAndSearch('Unknown')

    expect(await screen.findByText(/no patients found/i)).toBeInTheDocument()
  })

  // ── Debounce ────────────────────────────────────────────────────────────────
  it('debounces rapid keystrokes and fires only one request', async () => {
    mockFhirClient.mockResolvedValue({ ok: true, data: makeBundle([]) } as any)

    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    const input = screen.getByPlaceholderText(/search patients/i)

    // Type three characters; each fires onSearch and resets the debounce timer.
    // Only the final scheduled timer fires when we flush.
    await user.type(input, 'Smi')
    await act(async () => { jest.runAllTimers() })

    await waitFor(() => expect(mockFhirClient).toHaveBeenCalledTimes(1))
  })

  // ── Error states ────────────────────────────────────────────────────────────
  it('renders an HTTP error message on 4xx response', async () => {
    mockFhirClient.mockResolvedValue({
      ok: false,
      error: { type: 'http', status: 404, message: '404 Not Found' },
    } as any)

    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    await typeAndSearch('Smith')

    expect(await screen.findByText(/404 Not Found/i)).toBeInTheDocument()
  })

  it('renders CORS error with origin hint', async () => {
    mockFhirClient.mockResolvedValue({
      ok: false,
      error: { type: 'cors', message: 'CORS error: request blocked' },
    } as any)

    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    await typeAndSearch('Smith')

    expect(await screen.findByText(/CORS/i)).toBeInTheDocument()
    expect(screen.getByText(/allows requests from this origin/i)).toBeInTheDocument()
  })

  it('renders network error with server-down/CORS hint', async () => {
    mockFhirClient.mockResolvedValue({
      ok: false,
      error: { type: 'network', message: 'Network error: connection refused' },
    } as any)

    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    await typeAndSearch('Smith')

    expect(await screen.findByText(/Network error/i)).toBeInTheDocument()
    expect(screen.getByText(/could not be reached/i)).toBeInTheDocument()
    expect(screen.getByText(/CORS policy/i)).toBeInTheDocument()
  })

  it('renders parse error with "unexpected response" hint', async () => {
    mockFhirClient.mockResolvedValue({
      ok: false,
      error: { type: 'parse', message: 'Failed to parse server response as JSON' },
    } as any)

    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    await typeAndSearch('Smith')

    expect(await screen.findByText(/parse server response/i)).toBeInTheDocument()
    expect(screen.getByText(/unexpected response/i)).toBeInTheDocument()
  })

  // ── Selection ───────────────────────────────────────────────────────────────
  it('calls onPatientSelect and addPatient when an option is selected', async () => {
    const patient: fhir4.Patient = {
      resourceType: 'Patient',
      id: 'pt2',
      name: [{ given: ['Bob'], family: 'Jones' }],
      birthDate: '1975-03-10',
      gender: 'male',
    }
    mockFhirClient.mockResolvedValue({ ok: true, data: makeBundle([patient]) } as any)

    render(<FhirPatientSearchPanel dataEndpointUrl={ENDPOINT} onPatientSelect={onPatientSelect} />)
    await typeAndSearch('Jones')

    const option = await screen.findByText('Bob Jones')
    await user.click(option)

    expect(onPatientSelect).toHaveBeenCalledWith(
      'Patient/pt2',
      expect.objectContaining({ id: 'pt2', source: 'endpoint' }),
      expect.stringContaining('"resourceType":"Patient"')
    )
    expect(addPatient).toHaveBeenCalledWith(expect.objectContaining({ id: 'pt2' }))
  })
})

