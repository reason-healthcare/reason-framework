import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecentPatientsPanel from 'components/apply-form/RecentPatientsPanel'
import { PatientSummary } from 'utils/recentPatientsStore'

jest.mock('utils/recentPatientsStore', () => ({
  getAllPatients: jest.fn(),
  clearAll: jest.fn(),
}))

import { getAllPatients, clearAll } from 'utils/recentPatientsStore'

const mockGetAllPatients = getAllPatients as jest.MockedFunction<typeof getAllPatients>
const mockClearAll = clearAll as jest.MockedFunction<typeof clearAll>

const EP_URL = 'http://fhir.example.com/fhir'

const endpointPatient: PatientSummary = {
  id: 'ep1',
  name: 'Alice Brown',
  dob: '1985-07-15',
  gender: 'female',
  source: 'endpoint',
  endpointUrl: EP_URL,
  addedAt: '2024-06-01T12:00:00.000Z',
}

const manualPatient: PatientSummary = {
  id: 'man1',
  name: 'Bob Jones',
  dob: '1970-02-28',
  gender: 'male',
  source: 'manual',
  addedAt: '2024-01-01T12:00:00.000Z',
}

describe('RecentPatientsPanel', () => {
  const onPatientSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockClearAll.mockImplementation(() => {})
  })

  it('shows empty state when no recent patients', () => {
    mockGetAllPatients.mockReturnValue([])
    render(<RecentPatientsPanel endpointUrl={EP_URL} onPatientSelect={onPatientSelect} />)
    expect(screen.getByText(/no recently loaded patients/i)).toBeInTheDocument()
  })

  it('renders a list with patient names and DOB', () => {
    mockGetAllPatients.mockReturnValue([endpointPatient, manualPatient])
    render(<RecentPatientsPanel endpointUrl={EP_URL} onPatientSelect={onPatientSelect} />)
    expect(screen.getByText('Alice Brown')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    expect(screen.getByText(/1985-07-15/)).toBeInTheDocument()
  })

  it('shows "Data Endpoint" badge for endpoint-sourced patients', () => {
    mockGetAllPatients.mockReturnValue([endpointPatient])
    render(<RecentPatientsPanel endpointUrl={EP_URL} onPatientSelect={onPatientSelect} />)
    expect(screen.getByText('Data Endpoint')).toBeInTheDocument()
  })

  it('shows "Manual" badge for manual-sourced patients', () => {
    mockGetAllPatients.mockReturnValue([manualPatient])
    render(<RecentPatientsPanel endpointUrl={EP_URL} onPatientSelect={onPatientSelect} />)
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })

  it('calls onPatientSelect with correct subject when a row is clicked', async () => {
    mockGetAllPatients.mockReturnValue([endpointPatient])
    render(<RecentPatientsPanel endpointUrl={EP_URL} onPatientSelect={onPatientSelect} />)
    await userEvent.click(screen.getByText('Alice Brown'))
    expect(onPatientSelect).toHaveBeenCalledWith('Patient/ep1', endpointPatient)
  })

  it('calls clearAll and reverts to empty state on clear button click', async () => {
    mockGetAllPatients
      .mockReturnValueOnce([endpointPatient]) // initial load
    render(<RecentPatientsPanel endpointUrl={EP_URL} onPatientSelect={onPatientSelect} />)
    expect(screen.getByText('Alice Brown')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /clear history/i }))
    expect(mockClearAll).toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByText(/no recently loaded patients/i)).toBeInTheDocument()
    )
  })

  it('renders a scroll container around the patient list', () => {
    mockGetAllPatients.mockReturnValue([endpointPatient])
    render(<RecentPatientsPanel endpointUrl={EP_URL} onPatientSelect={onPatientSelect} />)
    const scrollEl = document.querySelector('.recent-patients-scroll') as HTMLElement
    expect(scrollEl).toBeInTheDocument()
    expect(scrollEl.style.maxHeight).toBe('320px')
    expect(scrollEl.style.overflowY).toBe('auto')
  })
})
