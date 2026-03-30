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

jest.mock('components/apply-form/PatientSelectionPanel', () => ({
  __esModule: true,
  default: (props: { searchPlaceholder?: string; sourceFilter?: string }) => (
    <div data-testid={props.sourceFilter === 'package' ? 'bundle-panel' : 'recent-panel'}>
      {props.searchPlaceholder ? <input placeholder={props.searchPlaceholder} /> : null}
      {props.sourceFilter === 'package' ? 'Bundle Panel' : 'Recent Panel'}
    </div>
  ),
}))

jest.mock('utils/recentPatientsStore', () => ({
  getAllPatients: jest.fn(),
  getPackageCatalog: jest.fn(),
}))

import { getAllPatients, getPackageCatalog } from 'utils/recentPatientsStore'
const mockGetAllPatients = getAllPatients as jest.MockedFunction<typeof getAllPatients>
const mockGetPackageCatalog = getPackageCatalog as jest.MockedFunction<typeof getPackageCatalog>

const BASE_PROPS = {
  resolver: undefined,
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
    mockGetPackageCatalog.mockReturnValue([])
  })

  it('renders the three segment options', () => {
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.getByText('FHIR Bundle')).toBeInTheDocument()
    expect(screen.getByText('FHIR Data Endpoint')).toBeInTheDocument()
    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  it('defaults to bundle select content when package bundles exist', () => {
    mockGetPackageCatalog.mockReturnValue([
      { id: 'Bundle/Test1', name: 'Alice [Bundle/Test1]', source: 'package', addedAt: new Date().toISOString() } as any,
    ])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.getByTestId('bundle-panel')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search bundles')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Patient/Patient-1')).not.toBeInTheDocument()
  })

  it('does not show FHIR panel when FHIR option is disabled (no endpoint)', async () => {
    mockGetPackageCatalog.mockReturnValue([
      { id: 'Bundle/Test1', name: 'Alice [Bundle/Test1]', source: 'package', addedAt: new Date().toISOString() } as any,
    ])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} dataEndpointUrl={undefined} />)
    await userEvent.click(screen.getByText('FHIR Data Endpoint'))
    expect(screen.getByTestId('bundle-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('fhir-panel')).not.toBeInTheDocument()
  })

  it('does not show bundle select when no package bundles exist', async () => {
    mockGetAllPatients.mockReturnValue([])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.queryByRole('heading', { name: /FHIR Bundle Select/i })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search bundles')).not.toBeInTheDocument()
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
    mockGetPackageCatalog.mockReturnValue([
      { id: 'Bundle/Test1', name: 'Alice [Bundle/Test1]', source: 'package', addedAt: new Date().toISOString() } as any,
    ])
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

  it('maps legacy manual session key to bundle select', () => {
    sessionStorage.setItem('cpg-review:patient-load-mode', 'manual')
    mockGetPackageCatalog.mockReturnValue([
      { id: 'Bundle/Test1', name: 'Alice [Bundle/Test1]', source: 'package', addedAt: new Date().toISOString() } as any,
    ])
    render(<PatientLoadModeSwitcher {...BASE_PROPS} />)
    expect(screen.getByTestId('bundle-panel')).toBeInTheDocument()
  })
})
