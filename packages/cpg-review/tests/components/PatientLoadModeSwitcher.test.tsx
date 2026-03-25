import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PatientLoadModeSwitcher from 'components/apply-form/PatientLoadModeSwitcher'

// Mock child panels so switcher tests stay focused on tab behavior
jest.mock('components/apply-form/FhirPatientSearchPanel', () => ({
  __esModule: true,
  default: ({ dataEndpointUrl }: { dataEndpointUrl: string }) => (
    <div data-testid="fhir-panel">FHIR Panel ({dataEndpointUrl})</div>
  ),
}))

jest.mock('components/apply-form/RecentPatientsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="recent-panel">Recent Panel</div>,
}))

jest.mock('lib/recentPatientsStore', () => ({
  getAllPatients: jest.fn(),
}))

import { getAllPatients } from 'lib/recentPatientsStore'
const mockGetAllPatients = getAllPatients as jest.MockedFunction<typeof getAllPatients>

const BASE_PROPS = {
  dataEndpointUrl: 'http://fhir.example.com/fhir',
  dataPayload: undefined,
  onDataPayloadChange: jest.fn(),
  subjectPayload: undefined,
  onSubjectChange: jest.fn(),
  onPatientSelect: jest.fn(),
}

describe('PatientLoadModeSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    mockGetAllPatients.mockReturnValue([])
  })

  it('renders the three segment options', () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('FHIR Data Endpoint')).toBeInTheDocument()
    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  it('defaults to Manual content', () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.getByRole('heading', { name: /Context Data/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Patient/Patient-1')).toBeInTheDocument()
  })

  it('does not show FHIR panel when FHIR option is disabled (no endpoint)', async () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} dataEndpointUrl={undefined} />)
    await userEvent.click(screen.getByText('FHIR Data Endpoint'))
    // Manual content should still be visible — disabled option can't activate
    expect(screen.getByRole('heading', { name: /Context Data/i })).toBeInTheDocument()
    expect(screen.queryByTestId('fhir-panel')).not.toBeInTheDocument()
  })

  it('does not show Recent panel when Recent option is disabled (no recents)', async () => {
    mockGetAllPatients.mockReturnValue([])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    await userEvent.click(screen.getByText('Recent'))
    expect(screen.getByRole('heading', { name: /Context Data/i })).toBeInTheDocument()
    expect(screen.queryByTestId('recent-panel')).not.toBeInTheDocument()
  })

  it('enables and activates Recent option when recent patients exist', async () => {
    mockGetAllPatients.mockReturnValue([
      { id: 'p1', name: 'Alice', source: 'manual', addedAt: new Date().toISOString() } as any,
    ])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    await userEvent.click(screen.getByText('Recent'))
    expect(screen.getByTestId('recent-panel')).toBeInTheDocument()
  })

  it('switches to FHIR panel on option click and persists to sessionStorage', async () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    await userEvent.click(screen.getByText('FHIR Data Endpoint'))
    expect(screen.getByTestId('fhir-panel')).toBeInTheDocument()
    expect(sessionStorage.getItem('cpg-review:patient-load-mode')).toBe('fhir')
  })

  it('restores last active segment from sessionStorage', () => {
    sessionStorage.setItem('cpg-review:patient-load-mode', 'fhir')
    mockGetAllPatients.mockReturnValue([])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.getByTestId('fhir-panel')).toBeInTheDocument()
  })
})
