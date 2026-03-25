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

  it('renders the three tabs', () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.getByRole('tab', { name: /manual/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /fhir data endpoint/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /recent/i })).toBeInTheDocument()
  })

  it('defaults to Manual tab', () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    const manualTab = screen.getByRole('tab', { name: /manual/i })
    expect(manualTab).toHaveAttribute('aria-selected', 'true')
  })

  it('disables the FHIR tab when no dataEndpointUrl', () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} dataEndpointUrl={undefined} />)
    const fhirTab = screen.getByRole('tab', { name: /fhir data endpoint/i })
    expect(fhirTab).toHaveAttribute('aria-disabled', 'true')
  })

  it('disables the Recent tab when there are no recent patients', () => {
    mockGetAllPatients.mockReturnValue([])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    const recentTab = screen.getByRole('tab', { name: /recent/i })
    expect(recentTab).toHaveAttribute('aria-disabled', 'true')
  })

  it('enables the Recent tab when recent patients exist', () => {
    mockGetAllPatients.mockReturnValue([
      { id: 'p1', name: 'Alice', source: 'manual', addedAt: new Date().toISOString() } as any,
    ])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    const recentTab = screen.getByRole('tab', { name: /recent/i })
    expect(recentTab).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('switches to FHIR panel on tab click and persists to sessionStorage', async () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    await userEvent.click(screen.getByRole('tab', { name: /fhir data endpoint/i }))
    expect(screen.getByTestId('fhir-panel')).toBeInTheDocument()
    expect(sessionStorage.getItem('cpg-review:patient-load-mode')).toBe('fhir')
  })

  it('restores last active tab from sessionStorage', () => {
    sessionStorage.setItem('cpg-review:patient-load-mode', 'fhir')
    mockGetAllPatients.mockReturnValue([])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.getByTestId('fhir-panel')).toBeInTheDocument()
  })
})
