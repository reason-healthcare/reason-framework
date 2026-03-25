'use client'

import { Input, Segmented, Tooltip, Typography } from 'antd'
import { useEffect, useState } from 'react'
import FhirPatientSearchPanel from 'components/apply-form/FhirPatientSearchPanel'
import RecentPatientsPanel from 'components/apply-form/RecentPatientsPanel'
import { getAllPatients, PatientSummary } from 'lib/recentPatientsStore'

const { Text } = Typography

const SESSION_KEY = 'cpg-review:patient-load-mode'
type SegmentKey = 'manual' | 'fhir' | 'recent'

interface PatientLoadModeSwitcherProps {
  dataEndpointUrl: string | undefined
  dataPayload: string | undefined
  onDataPayloadChange: (val: string | undefined) => void
  subjectPayload: string | undefined
  onSubjectChange: (val: string) => void
  onPatientSelect: (subject: string, summary: PatientSummary) => void
}

const PatientLoadModeSwitcher = ({
  dataEndpointUrl,
  dataPayload,
  onDataPayloadChange,
  subjectPayload,
  onSubjectChange,
  onPatientSelect,
}: PatientLoadModeSwitcherProps) => {
  const [activeKey, setActiveKey] = useState<SegmentKey>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem(SESSION_KEY) as SegmentKey) ?? 'manual'
    }
    return 'manual'
  })

  const hasEndpoint = !!dataEndpointUrl?.trim()
  const hasRecents = getAllPatients(dataEndpointUrl).length > 0

  // If the stored segment is no longer valid, fall back to manual
  useEffect(() => {
    if (activeKey === 'fhir' && !hasEndpoint) setActiveKey('manual')
  }, [hasEndpoint, activeKey])

  const handleChange = (key: string | number) => {
    const k = key as SegmentKey
    setActiveKey(k)
    sessionStorage.setItem(SESSION_KEY, k)
  }

  const options = [
    { value: 'manual', label: 'Manual' },
    {
      value: 'fhir',
      label: (
        <Tooltip title={!hasEndpoint ? 'Configure a data endpoint to enable patient search' : undefined}>
          <span>FHIR Data Endpoint</span>
        </Tooltip>
      ),
      disabled: !hasEndpoint,
    },
    {
      value: 'recent',
      label: (
        <Tooltip title={!hasRecents ? 'No recently loaded patients' : undefined}>
          <span>Recent</span>
        </Tooltip>
      ),
      disabled: !hasRecents,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 4 }}>
      <Segmented
        value={activeKey}
        onChange={handleChange}
        options={options}
        block
      />

      {activeKey === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h1 className="form-title">Context Data</h1>
            <p className="form-description">Add context data as a FHIR JSON Bundle.</p>
            <Input.TextArea
              onChange={(e) => onDataPayloadChange(e.target.value || undefined)}
              value={dataPayload}
              rows={6}
            />
          </div>
          <div>
            <h1 className="form-title">Subject</h1>
            <p className="form-description">Set reference to subject.</p>
            <Input
              placeholder="Patient/Patient-1"
              defaultValue="Patient/Patient1"
              onChange={(e) => onSubjectChange(e.target.value)}
              value={subjectPayload}
            />
          </div>
        </div>
      )}

      {activeKey === 'fhir' && hasEndpoint && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Text type="secondary">
            Search patients on <Text code>{dataEndpointUrl}</Text>
          </Text>
          <FhirPatientSearchPanel
            dataEndpointUrl={dataEndpointUrl!}
            onPatientSelect={onPatientSelect}
          />
        </div>
      )}

      {activeKey === 'recent' && (
        <RecentPatientsPanel
          endpointUrl={dataEndpointUrl}
          onPatientSelect={onPatientSelect}
        />
      )}
    </div>
  )
}

export default PatientLoadModeSwitcher
