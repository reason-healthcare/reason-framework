import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SelectedPatientPreviewCard from 'components/apply-form/SelectedPatientPreviewCard'

const BUNDLE = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      fullUrl: 'http://example.org/fhir/Patient/pt1',
      resource: {
        resourceType: 'Patient',
        id: 'pt1',
        name: [{ given: ['Jane'], family: 'Doe' }],
        birthDate: '1990-01-01',
        gender: 'female',
      },
    },
    {
      fullUrl: 'http://example.org/fhir/Medication/med1',
      resource: {
        resourceType: 'Medication',
        id: 'med1',
        code: {
          text: 'Atorvastatin 20mg',
        },
      },
    },
    {
      resource: {
        resourceType: 'MedicationRequest',
        id: 'med1',
        subject: { reference: 'http://example.org/fhir/Patient/pt1/_history/1' },
        medicationReference: { reference: 'Medication/med1' },
      },
    },
    {
      resource: {
        resourceType: 'Condition',
        id: 'cond1',
        subject: { reference: 'Patient/pt1' },
        code: { text: 'Hypertension' },
        text: { status: 'generated', div: '<div>Hypertension (narrative)</div>' },
      },
    },
    {
      resource: {
        resourceType: 'Observation',
        id: 'obs1',
        subject: { reference: 'Patient/pt1' },
        code: { text: 'Blood pressure' },
        valueQuantity: { value: 120, unit: 'mmHg' },
      },
    },
  ],
}

describe('SelectedPatientPreviewCard', () => {
  it('does not render when no subject is set', () => {
    render(
      <SelectedPatientPreviewCard
        subjectPayload={undefined}
        dataPayload={undefined}
        selectedPatient={undefined}
        onClear={jest.fn()}
      />
    )

    expect(screen.queryByTestId('selected-patient-preview')).toBeNull()
  })

  it('renders overview and supports tab switching', async () => {
    render(
      <SelectedPatientPreviewCard
        subjectPayload="http://example.org/fhir/Patient/pt1"
        dataPayload={JSON.stringify(BUNDLE)}
        selectedPatient={undefined}
        onClear={jest.fn()}
      />
    )

    expect(screen.getByTestId('selected-patient-preview')).toBeInTheDocument()
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByText('Medications'))
    expect(screen.getByText('Atorvastatin 20mg')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Conditions'))
    expect(screen.getByText('Hypertension (narrative)')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Observations'))
    expect(screen.getByText('Blood pressure: 120 mmHg')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Raw JSON'))
    expect(screen.getByText(/"resourceType": "Bundle"/)).toBeInTheDocument()
    expect(screen.getByText(/"fullUrl": "http:\/\/example.org\/fhir\/Patient\/pt1"/)).toBeInTheDocument()
    expect(screen.queryByText(/"selectedPatient":/)).toBeNull()
  })

  it('collapses and expands details using the selected toggle', async () => {
    render(
      <SelectedPatientPreviewCard
        subjectPayload="http://example.org/fhir/Patient/pt1"
        dataPayload={JSON.stringify(BUNDLE)}
        selectedPatient={undefined}
        onClear={jest.fn()}
      />
    )

    const toggle = screen.getByRole('button', {
      name: /toggle selected patient details/i,
    })

    expect(screen.getByText('Overview')).toBeInTheDocument()

    await userEvent.click(toggle)
    expect(screen.queryByText('Overview')).toBeNull()

    await userEvent.click(toggle)
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('calls onClear when clear button is clicked', async () => {
    const onClear = jest.fn()

    render(
      <SelectedPatientPreviewCard
        subjectPayload="http://example.org/fhir/Patient/pt1"
        dataPayload={JSON.stringify(BUNDLE)}
        selectedPatient={undefined}
        onClear={onClear}
      />
    )

    await userEvent.click(
      screen.getByRole('button', { name: /clear selected patient/i })
    )

    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
