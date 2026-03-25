'use client'

import { Input, Tabs, Typography } from 'antd'
import { useEffect, useState } from 'react'
import FhirPatientSearchPanel from 'components/apply-form/FhirPatientSearchPanel'
import RecentPatientsPanel from 'components/apply-form/RecentPatientsPanel'
import { getAllPatients, PatientSummary } from 'lib/recentPatientsStore'

const { Text } = Typography

const SESSION_KEY = 'cpg-review:patient-load-mode'
type TabKey = 'manual' | 'fhir' | 'recent'

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
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem(SESSION_KEY) as TabKey) ?? 'manual'
    }
    return 'manual'
  })

  const hasEndpoint = !!dataEndpointUrl?.trim()
  const hasRecents = getAllPatients(dataEndpointUrl).length > 0

  // If the stored tab is no longer valid, fall back to manual
  useEffect(() => {
    if (activeTab === 'fhir' && !hasEndpoint) setActiveTab('manual')
  }, [hasEndpoint, activeTab])

  const handleTabChange = (key: string) => {
    const tab = key as TabKey
    setActiveTab(tab)
    sessionStorage.setItem(SESSION_KEY, tab)
  }

  return (
    <Tabs
      activeKey={activeTab}
      onChange={handleTabChange}
      size="small"
      style={{ marginTop: 4 }}
      items={[
        {
          key: 'manual',
          label: 'Manual',
          children: (
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
          ),
        },
        {
          key: 'fhir',
          label: 'FHIR Data Endpoint',
          disabled: !hasEndpoint,
          children: hasEndpoint ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Text type="secondary">
                Search patients on <Text code>{dataEndpointUrl}</Text>
              </Text>
              <FhirPatientSearchPanel
                dataEndpointUrl={dataEndpointUrl!}
                onPatientSelect={onPatientSelect}
              />
            </div>
          ) : null,
        },
        {
          key: 'recent',
          label: 'Recent',
          disabled: !hasRecents,
          children: (
            <RecentPatientsPanel
              endpointUrl={dataEndpointUrl}
              onPatientSelect={onPatientSelect}
            />
          ),
        },
      ]}
    />
  )
}

export default PatientLoadModeSwitcher
