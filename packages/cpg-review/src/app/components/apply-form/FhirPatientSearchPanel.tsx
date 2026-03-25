'use client'

import { Select, Typography } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import { fhirClient } from 'lib/fhirClient'
import { addPatient, renderPatientName, PatientSummary } from 'lib/recentPatientsStore'

const { Text } = Typography

const DEBOUNCE_MS = 300

interface FhirPatientSearchPanelProps {
  /** Address of the FHIR data endpoint (dataEndpoint.address). */
  dataEndpointUrl: string
  onPatientSelect: (subject: string, summary: PatientSummary) => void
}

interface PatientRow {
  id: string
  name: string
  dob: string | undefined
  gender: string | undefined
}

function toPatientRow(resource: fhir4.Patient): PatientRow {
  return {
    id: resource.id ?? '',
    name: renderPatientName(resource.name),
    dob: resource.birthDate,
    gender: resource.gender,
  }
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; rows: PatientRow[] }
  | { status: 'empty' }
  | { status: 'error'; message: string; errorType: 'network' | 'cors' | 'http' | 'parse' }

const FhirPatientSearchPanel = ({
  dataEndpointUrl,
  onPatientSelect,
}: FhirPatientSearchPanelProps) => {
  const [searchState, setSearchState] = useState<SearchState>({ status: 'idle' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = async (query: string) => {
    setSearchState({ status: 'loading' })

    const result = await fhirClient<fhir4.Bundle>(dataEndpointUrl, {
      path: '/Patient',
      params: { name: query },
    })

    if (!result.ok) {
      setSearchState({
        status: 'error',
        message: result.error.message,
        errorType: result.error.type,
      })
      return
    }

    const entries = result.data.entry ?? []
    const rows: PatientRow[] = entries
      .map((e) => e.resource)
      .filter((r): r is fhir4.Patient => r?.resourceType === 'Patient' && !!r.id)
      .map(toPatientRow)

    setSearchState(rows.length > 0 ? { status: 'results', rows } : { status: 'empty' })
  }

  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSearchState({ status: 'idle' })
      return
    }
    debounceRef.current = setTimeout(() => runSearch(value.trim()), DEBOUNCE_MS)
  }

  const handleChange = (patientId: string) => {
    if (searchState.status !== 'results') return
    const row = searchState.rows.find((r) => r.id === patientId)
    if (!row) return

    const summary: PatientSummary = {
      id: row.id,
      name: row.name,
      dob: row.dob,
      gender: row.gender,
      source: 'endpoint',
      endpointUrl: dataEndpointUrl,
      addedAt: new Date().toISOString(),
    }
    addPatient(summary)
    onPatientSelect(`Patient/${row.id}`, summary)
  }

  const isLoading = searchState.status === 'loading'

  const rows = searchState.status === 'results' ? searchState.rows : []

  const options = rows.map((row) => ({
    value: row.id,
    label: row.name,
  }))

  const notFoundContent =
    isLoading ? 'Searching…' :
    searchState.status === 'empty' ? 'No patients found. Try a different name.' :
    'Type to search patients'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Select
        showSearch
        filterOption={false}
        placeholder="Search patients by name"
        loading={isLoading}
        options={options}
        notFoundContent={notFoundContent}
        onSearch={handleSearch}
        onChange={handleChange}
        optionRender={(option) => {
          const row = rows.find((r) => r.id === option.value)
          if (!row) return option.label
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Text strong>{row.name}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                DOB: {row.dob ?? '—'} &nbsp;·&nbsp; Gender: {row.gender ?? '—'} &nbsp;·&nbsp; ID: {row.id}
              </Text>
            </div>
          )
        }}
        style={{ width: '100%' }}
        aria-label="Search patients by name"
      />

      {searchState.status === 'error' && (
        <div
          style={{
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 6,
            padding: '0.75rem',
            display: 'flex',
            gap: '0.5rem',
          }}
        >
          <WarningOutlined style={{ color: '#ff4d4f', marginTop: 2 }} />
          <div>
            <Text type="danger">{searchState.message}</Text>
            {searchState.errorType === 'cors' && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Ensure the FHIR server allows requests from this origin and that the
                  data endpoint URL is correct.
                </Text>
              </div>
            )}
            {searchState.errorType === 'network' && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  The server could not be reached. Verify the data endpoint URL is
                  correct and the server is running. If the server is running, it may
                  also be blocking requests due to CORS policy.
                </Text>
              </div>
            )}
            {searchState.errorType === 'parse' && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  The server returned an unexpected response. Confirm the endpoint is a
                  valid FHIR server.
                </Text>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FhirPatientSearchPanel
