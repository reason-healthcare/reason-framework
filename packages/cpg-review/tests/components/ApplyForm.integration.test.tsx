import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApplyForm from 'components/apply-form/ApplyForm'

// Mock next/navigation and heavy child components to keep tests fast
jest.mock('components/apply-form/QuestionnaireRenderer', () => ({
  __esModule: true,
  default: () => <div>QuestionnaireRenderer</div>,
}))

jest.mock('helpers', () => ({
  is: {
    Bundle: jest.fn((v: any) => v?.resourceType === 'Bundle'),
    PlanDefinition: jest.fn(() => false),
    ActivityDefinition: jest.fn(() => false),
  },
  isMarkdown: jest.fn(() => false),
  formatMarkdown: jest.fn((v: string) => v),
  notEmpty: jest.fn((v: any) => v != null),
}))

jest.mock('page', () => ({}), { virtual: true })

jest.mock('api/apply/route', () => ({
  ApplyPayload: undefined, // type-only export, no runtime value needed
}))

jest.mock('utils/recentPatientsStore', () => ({
  addPatient: jest.fn(),
  renderPatientName: jest.fn((names: any[]) => (names?.[0]?.family ?? 'Unknown')),
  getAllPatients: jest.fn(() => []),
  getPackageCatalog: jest.fn(() => []),
}))

jest.mock('utils/fhirClient', () => ({
  fhirClient: jest.fn(),
}))

import { addPatient, getAllPatients, getPackageCatalog } from 'utils/recentPatientsStore'
import { fhirClient } from 'utils/fhirClient'

const mockAddPatient = addPatient as jest.MockedFunction<typeof addPatient>
const mockGetAllPatients = getAllPatients as jest.MockedFunction<typeof getAllPatients>
const mockGetPackageCatalog = getPackageCatalog as jest.MockedFunction<typeof getPackageCatalog>
const mockFhirClient = fhirClient as jest.MockedFunction<typeof fhirClient>

const PLAN_DEF: fhir4.PlanDefinition = {
  resourceType: 'PlanDefinition',
  id: 'test-plan',
  status: 'active',
  url: 'http://example.com/PlanDefinition/test-plan',
}

const PACKAGE_ENTRY = {
  id: 'Bundle/Test123',
  name: 'Eve Pack [Bundle/Test123]',
  dob: undefined,
  gender: undefined,
  source: 'package' as const,
  bundleId: 'Test123',
  bundleReference: 'Bundle/Test123',
  patientId: 'pkg-1',
  resourceCount: 2,
  resourceTypes: ['Patient', 'Observation'],
  bundleJson: JSON.stringify({
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: 'pkg-1',
          name: [{ given: ['Eve'], family: 'Pack' }],
          birthDate: '1980-01-01',
          gender: 'female',
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-1',
          status: 'final',
          code: { text: 'Heart Rate' },
          subject: { reference: 'Patient/pkg-1' },
        },
      },
    ],
  }),
  addedAt: new Date().toISOString(),
}

function renderForm(extra?: Partial<React.ComponentProps<typeof ApplyForm>>) {
  const setRequestsBundle = jest.fn()
  const setContextReference = jest.fn()
  const setSidePanelView = jest.fn()

  return render(
    <ApplyForm
      resolver={undefined}
      planDefinition={PLAN_DEF}
      contentEndpoint={undefined}
      setRequestsBundle={setRequestsBundle}
      setContextReference={setContextReference}
      setSidePanelView={setSidePanelView}
      {...extra}
    />
  )
}

describe('FHIR Bundle Select replaces manual JSON entry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    mockGetAllPatients.mockReturnValue([PACKAGE_ENTRY as any])
    mockGetPackageCatalog.mockReturnValue([PACKAGE_ENTRY as any])
  })

  it('does not render manual JSON controls and instead renders FHIR Bundle Select', async () => {
    renderForm()

    expect(screen.getByRole('heading', { name: /FHIR Bundle Select/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search bundles')).toBeInTheDocument()
    expect(screen.queryByText(/Context Data/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Patient/Patient-1')).not.toBeInTheDocument()
  })
})

// ── Task 7.5: select patient via FHIR tab → subject updated ──────────────────
// FhirPatientSearchPanel is unit-tested separately; stub it here to keep the
// integration test focused on subject propagation rather than search UX.
jest.mock('components/apply-form/FhirPatientSearchPanel', () => ({
  __esModule: true,
  default: ({ onPatientSelect }: { onPatientSelect: (subject: string, summary: any) => void }) => (
    <button
      type="button"
      onClick={() =>
        onPatientSelect('Patient/fhir-pt', {
          id: 'fhir-pt',
          name: 'Alice Smith',
          dob: '1992-09-01',
          gender: 'female',
          source: 'endpoint',
          endpointUrl: 'http://localhost:8080/fhir',
          addedAt: new Date().toISOString(),
        })
      }
    >
      Select FHIR Patient
    </button>
  ),
}))

describe('Task 7.5 – FHIR tab patient selection updates subject', () => {
  const searchBundle: fhir4.Bundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: 'fhir-pt',
          name: [{ given: ['Alice'], family: 'Smith' }],
          birthDate: '1992-09-01',
          gender: 'female',
        },
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    mockGetAllPatients.mockReturnValue([])
  })

  it('sets subject to Patient/<id> after selecting a result from the FHIR search panel', async () => {
    renderForm()

    // Switch to FHIR tab (it's enabled because Data Endpoint field defaults to http://localhost:8080/fhir)
    await userEvent.click(screen.getByText('FHIR Data Endpoint'))

    // Use the stub to select a patient
    await userEvent.click(screen.getByRole('button', { name: /select fhir patient/i }))

    await waitFor(() => {
      const preview = screen.getByTestId('selected-patient-preview')
      expect(preview).toBeInTheDocument()
      expect(within(preview).getAllByText('Alice Smith').length).toBeGreaterThan(0)
      expect(within(preview).getByText(/from fhir server/i)).toBeInTheDocument()
    })
  })
})

describe('Package bundle recent selection integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    mockGetAllPatients.mockReturnValue([PACKAGE_ENTRY as any])
    mockGetPackageCatalog.mockReturnValue([PACKAGE_ENTRY as any])
  })

  it('selects package bundle from Recent tab and shows preview/raw JSON from selected bundle', async () => {
    renderForm()

    await userEvent.click(screen.getByText('Recent'))
    expect(screen.getByText('Eve Pack [Bundle/Test123]')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: /select eve pack \[bundle\/test123\]/i })
    )

    await waitFor(() => {
      expect(screen.getByTestId('selected-patient-preview')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('tab', { name: /raw json/i }))

    await waitFor(() => {
      expect(screen.getByText(/"resourceType": "Observation"/)).toBeInTheDocument()
    })
  })

  it('browses and selects package bundles from the FHIR Bundle Select tab', async () => {
    renderForm()

    expect(screen.getByRole('heading', { name: /FHIR Bundle Select/i })).toBeInTheDocument()
    expect(screen.getByText('Eve Pack [Bundle/Test123]')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Search bundles'), 'Eve Pack')
    await userEvent.click(
      screen.getByRole('button', { name: /select eve pack \[bundle\/test123\]/i })
    )

    await waitFor(() => {
      expect(screen.getByTestId('selected-patient-preview')).toBeInTheDocument()
    })
  })
})
