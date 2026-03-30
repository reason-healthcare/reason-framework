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
        identifier: [
          {
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'SS' }],
            },
            value: '999-99-1234',
          },
          {
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  code: 'MR',
                },
              ],
            },
            use: 'usual',
            value: 'MRN-pt1',
          },
        ],
        address: [
          {
            text: '123 Main Street, Boston, MA 02101',
            line: ['123 Main Street'],
            city: 'Boston',
            state: 'MA',
            postalCode: '02101',
          },
        ],
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

const PATIENT_ONLY_BUNDLE = {
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
        identifier: [
          {
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'SS' }],
            },
            value: '999-99-1234',
          },
          {
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  code: 'MR',
                },
              ],
            },
            use: 'usual',
            value: 'MRN-pt1',
          },
        ],
        address: [
          {
            text: '123 Main Street, Boston, MA 02101',
            line: ['123 Main Street'],
            city: 'Boston',
            state: 'MA',
            postalCode: '02101',
          },
        ],
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
    expect(screen.getByText('MRN')).toBeInTheDocument()
    expect(screen.getByText('MRN-pt1')).toBeInTheDocument()
    expect(screen.getByText('Address')).toBeInTheDocument()
    expect(screen.getByText('123 Main Street, Boston, MA 02101')).toBeInTheDocument()

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

  it('shows endpoint-specific not-loaded empty states for resource tabs', async () => {
    render(
      <SelectedPatientPreviewCard
        subjectPayload="http://example.org/fhir/Patient/pt1"
        dataPayload={JSON.stringify(PATIENT_ONLY_BUNDLE)}
        selectedPatient={{
          id: 'pt1',
          name: 'Jane Doe',
          dob: '1990-01-01',
          gender: 'female',
          source: 'endpoint',
          endpointUrl: 'http://example.org/fhir',
          addedAt: '2026-03-27T00:00:00.000Z',
        }}
        onClear={jest.fn()}
      />
    )

    await userEvent.click(screen.getByText('Medications'))
    expect(
      screen.getByText(
        'Medication data is not loaded for endpoint-selected patients in this selection.'
      )
    ).toBeInTheDocument()

    await userEvent.click(screen.getByText('Conditions'))
    expect(
      screen.getByText(
        'Condition data is not loaded for endpoint-selected patients in this selection.'
      )
    ).toBeInTheDocument()

    await userEvent.click(screen.getByText('Observations'))
    expect(
      screen.getByText(
        'Observation data is not loaded for endpoint-selected patients in this selection.'
      )
    ).toBeInTheDocument()
  })

  it('shows generic empty states for manual or bundle contexts', async () => {
    render(
      <SelectedPatientPreviewCard
        subjectPayload="http://example.org/fhir/Patient/pt1"
        dataPayload={JSON.stringify(PATIENT_ONLY_BUNDLE)}
        selectedPatient={{
          id: 'pt1',
          name: 'Jane Doe',
          dob: '1990-01-01',
          gender: 'female',
          source: 'package',
          addedAt: '2026-03-27T00:00:00.000Z',
        }}
        onClear={jest.fn()}
      />
    )

    await userEvent.click(screen.getByText('Medications'))
    expect(
      screen.getByText('No medications available for this patient context.')
    ).toBeInTheDocument()

    await userEvent.click(screen.getByText('Conditions'))
    expect(
      screen.getByText('No conditions available for this patient context.')
    ).toBeInTheDocument()

    await userEvent.click(screen.getByText('Observations'))
    expect(
      screen.getByText('No observations available for this patient context.')
    ).toBeInTheDocument()
  })
})
