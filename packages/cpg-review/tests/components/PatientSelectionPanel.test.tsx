import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PatientSelectionPanel from 'components/apply-form/PatientSelectionPanel'
import { PatientSummary } from 'utils/recentPatientsStore'

jest.mock('utils/recentPatientsStore', () => ({
  getAllPatients: jest.fn(),
  getPackageCatalog: jest.fn(),
  clearAll: jest.fn(),
  addPatient: jest.fn(),
  getPatientIdFromBundleJson: jest.requireActual('utils/recentPatientsStore')
    .getPatientIdFromBundleJson,
}))

import {
  getAllPatients,
  getPackageCatalog,
  clearAll,
  addPatient,
} from 'utils/recentPatientsStore'

const mockGetAllPatients = getAllPatients as jest.MockedFunction<
  typeof getAllPatients
>
const mockGetPackageCatalog = getPackageCatalog as jest.MockedFunction<
  typeof getPackageCatalog
>
const mockClearAll = clearAll as jest.MockedFunction<typeof clearAll>
const mockAddPatient = addPatient as jest.MockedFunction<typeof addPatient>

const EP_URL = 'http://fhir.example.com/fhir'

const endpointPatient: PatientSummary = {
  id: 'ep1',
  resourceType: 'Patient',
  name: 'Alice Brown',
  dob: '1985-07-15',
  gender: 'female',
  source: 'endpoint',
  endpointUrl: EP_URL,
  json: JSON.stringify({
    resourceType: 'Bundle',
    type: 'collection',
    entry: [{ resource: { resourceType: 'Patient', id: 'ep1' } }],
  }),
  addedAt: '2024-06-01T12:00:00.000Z',
}

const manualPatient: PatientSummary = {
  id: 'man1',
  resourceType: 'Bundle',
  name: 'Bob Jones',
  dob: '1970-02-28',
  gender: 'male',
  source: 'package',
  json: '',
  addedAt: '2024-01-01T12:00:00.000Z',
}

const packageBundle: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: {
        resourceType: 'Patient',
        id: 'pkg-1',
        name: [{ given: ['Eve'], family: 'Pack' }],
      },
    },
    {
      resource: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        code: { text: 'Heart Rate' },
      },
    },
  ],
}

const packagePatient: PatientSummary = {
  id: 'Test123',
  resourceType: 'Bundle',
  name: 'Eve Pack [Bundle/Test123]',
  dob: undefined,
  gender: undefined,
  source: 'package',
  json: JSON.stringify(packageBundle),
  resourceCount: 2,
  resourceTypes: ['Patient', 'Observation'],
  addedAt: '2024-08-01T12:00:00.000Z',
}

describe('PatientSelectionPanel', () => {
  const onPatientSelect = jest.fn()
  const onDataPayloadChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockClearAll.mockImplementation(() => {})
    mockGetPackageCatalog.mockReturnValue([])
  })

  it('shows empty state when no recent patients', () => {
    mockGetAllPatients.mockReturnValue([])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )
    expect(screen.getByText(/no recently loaded patients/i)).toBeInTheDocument()
  })

  it('renders a list with patient names and DOB', () => {
    mockGetAllPatients.mockReturnValue([endpointPatient, manualPatient])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )
    expect(screen.getByText('Alice Brown')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    expect(screen.getByText(/1985-07-15/)).toBeInTheDocument()
  })

  it('shows "Data Endpoint" badge for endpoint-sourced patients', () => {
    mockGetAllPatients.mockReturnValue([endpointPatient])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )
    expect(screen.getByText('Data Endpoint')).toBeInTheDocument()
  })

  it('shows "From Package" badge for package-sourced patients', () => {
    mockGetAllPatients.mockReturnValue([manualPatient])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )
    expect(screen.getByText('From Package')).toBeInTheDocument()
  })

  it('shows "From Package" badge and package resource metadata', () => {
    mockGetAllPatients.mockReturnValue([packagePatient])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )
    expect(screen.getByText('From Package')).toBeInTheDocument()
    expect(
      screen.getByText(/Resources: Patient, Observation/)
    ).toBeInTheDocument()
    expect(screen.getByText(/Count: 2/)).toBeInTheDocument()
  })

  it('calls onPatientSelect with correct subject when Select is clicked', async () => {
    mockGetAllPatients.mockReturnValue([endpointPatient])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /select alice brown/i })
    )
    expect(onPatientSelect).toHaveBeenCalledWith(
      { resourceType: 'Patient', id: 'ep1' },
      endpointPatient,
      undefined
    )
    expect(mockAddPatient).toHaveBeenCalledWith(
      expect.objectContaining({
        id: endpointPatient.id,
        source: endpointPatient.source,
      })
    )
  })

  it('allows keyboard selection via Enter on Select button', async () => {
    mockGetAllPatients.mockReturnValue([endpointPatient])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )

    await userEvent.tab()
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(onPatientSelect).toHaveBeenCalledWith(
      { resourceType: 'Patient', id: 'ep1' },
      endpointPatient,
      undefined
    )
  })

  it('calls clearAll and reverts to empty state on clear button click', async () => {
    mockGetAllPatients.mockReturnValueOnce([endpointPatient]) // initial load
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )
    expect(screen.getByText('Alice Brown')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: /clear history/i })
    )
    expect(mockClearAll).toHaveBeenCalled()
    await waitFor(() =>
      expect(
        screen.getByText(/no recently loaded patients/i)
      ).toBeInTheDocument()
    )
  })

  it('renders a scroll container around the patient list', () => {
    mockGetAllPatients.mockReturnValue([endpointPatient])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )
    const scrollEl = document.querySelector(
      '.recent-patients-scroll'
    ) as HTMLElement
    expect(scrollEl).toBeInTheDocument()
  })

  it('sets data payload when selecting a package bundle', async () => {
    mockGetAllPatients.mockReturnValue([packagePatient])
    render(
      <PatientSelectionPanel
        endpointUrl={EP_URL}
        onPatientSelect={onPatientSelect}
      />
    )

    await userEvent.click(
      screen.getByRole('button', {
        name: /select eve pack \[bundle\/test123\]/i,
      })
    )

    expect(onPatientSelect).toHaveBeenCalledWith(
      { resourceType: 'Patient', id: 'pkg-1' },
      packagePatient,
      packagePatient.json
    )
  })
})
