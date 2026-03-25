import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

jest.mock('lib/recentPatientsStore', () => ({
  addPatient: jest.fn(),
  renderPatientName: jest.fn((names: any[]) => (names?.[0]?.family ?? 'Unknown')),
  getAllPatients: jest.fn(() => []),
}))

jest.mock('lib/fhirClient', () => ({
  fhirClient: jest.fn(),
}))

import { addPatient } from 'lib/recentPatientsStore'
import { fhirClient } from 'lib/fhirClient'

const mockAddPatient = addPatient as jest.MockedFunction<typeof addPatient>
const mockFhirClient = fhirClient as jest.MockedFunction<typeof fhirClient>

const PLAN_DEF: fhir4.PlanDefinition = {
  resourceType: 'PlanDefinition',
  id: 'test-plan',
  status: 'active',
  url: 'http://example.com/PlanDefinition/test-plan',
}

const DATA_BUNDLE: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: {
        resourceType: 'Patient',
        id: 'pt-manual',
        name: [{ given: ['John'], family: 'Doe' }],
        birthDate: '1988-04-12',
        gender: 'male',
      },
    },
  ],
}

function renderForm(extra?: Partial<React.ComponentProps<typeof ApplyForm>>) {
  const setRequestsBundle = jest.fn()
  const setContextReference = jest.fn()
  const setSidePanelView = jest.fn()

  return render(
    <ApplyForm
      planDefinition={PLAN_DEF}
      contentEndpoint={undefined}
      setRequestsBundle={setRequestsBundle}
      setContextReference={setContextReference}
      setSidePanelView={setSidePanelView}
      {...extra}
    />
  )
}

// ── Task 6.2: manual submission writes recent patient ─────────────────────────
describe('Task 6.2 – manual submission writes to recent patients store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        resourceType: 'Parameters',
        parameter: [],
      }),
    } as unknown as Response)
  })

  it('calls addPatient with source=manual after a successful submit', async () => {
    renderForm()

    // Find all textboxes in the Manual tab
    const textareas = screen.getAllByRole('textbox')
    // Locate context data area and subject input
    // The manual tab contains a TextArea for context data and an Input for subject
    const contextInput = textareas.find((el) => el.tagName === 'TEXTAREA')
    const subjectInput = textareas.find(
      (el) => el.tagName === 'INPUT' && (el as HTMLInputElement).placeholder.includes('Patient')
    )

    if (contextInput) {
      fireEvent.change(contextInput, { target: { value: JSON.stringify(DATA_BUNDLE) } })
    }
    if (subjectInput) {
      fireEvent.change(subjectInput, { target: { value: 'Patient/pt-manual' } })
    }

    const applyButton = screen.getByRole('button', { name: /apply/i })
    await userEvent.click(applyButton)

    await waitFor(() => {
      expect(mockAddPatient).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'manual', id: 'pt-manual' })
      )
    })
  })
})

// ── Task 7.5: select patient via FHIR tab → subject updated ──────────────────
// FhirPatientSearchPanel is unit-tested separately; stub it here to keep the
// integration test focused on subject propagation rather than search UX.
jest.mock('components/apply-form/FhirPatientSearchPanel', () => ({
  __esModule: true,
  default: ({ onPatientSelect }: { onPatientSelect: (subject: string, summary: any) => void }) => (
    <button
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
  })

  it('sets subject to Patient/<id> after selecting a result from the FHIR search panel', async () => {
    renderForm()

    // Switch to FHIR tab (it's enabled because Data Endpoint field defaults to http://localhost:8080/fhir)
    await userEvent.click(screen.getByText('FHIR Data Endpoint'))

    // Use the stub to select a patient
    await userEvent.click(screen.getByRole('button', { name: /select fhir patient/i }))

    // Switch back to Manual tab to verify subject was set
    await userEvent.click(screen.getByText('Manual'))

    await waitFor(() => {
      const subjectInput = screen.getByDisplayValue('Patient/fhir-pt')
      expect(subjectInput).toBeInTheDocument()
    })
  })
})
