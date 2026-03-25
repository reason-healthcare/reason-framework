'use client'

import { List, Tag, Typography } from 'antd'
import { ClockCircleOutlined, ClearOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { getAllPatients, clearAll, PatientSummary } from 'utils/recentPatientsStore'

const { Text } = Typography

interface RecentPatientsPanelProps {
  /** If provided, loads recents scoped to this endpoint URL as well as manual entries. */
  endpointUrl: string | undefined
  onPatientSelect: (subject: string, summary: PatientSummary) => void
}

const RecentPatientsPanel = ({ endpointUrl, onPatientSelect }: RecentPatientsPanelProps) => {
  const [patients, setPatients] = useState<PatientSummary[]>([])

  const reload = () => setPatients(getAllPatients(endpointUrl))

  useEffect(() => {
    reload()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointUrl])

  const handleSelect = (summary: PatientSummary) => {
    onPatientSelect(`Patient/${summary.id}`, summary)
  }

  const handleClear = () => {
    clearAll()
    setPatients([])
  }

  if (patients.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', padding: '1.5rem 0' }}>
        <ClockCircleOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
        <Text type="secondary">No recently loaded patients yet.</Text>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="button-secondary button"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
          onClick={handleClear}
        >
          <ClearOutlined /> Clear history
        </button>
      </div>

      <div
        className="recent-patients-scroll"
        style={{ maxHeight: 320, overflowY: 'auto' }}
      >
        <List
          size="small"
          bordered
          dataSource={patients}
          renderItem={(p) => (
            <List.Item
              className="patient-list-item"
              style={{ cursor: 'pointer' }}
              extra={
                <Tag color={p.source === 'endpoint' ? 'blue' : 'default'}>
                  {p.source === 'endpoint' ? 'Data Endpoint' : 'Manual'}
                </Tag>
              }
              onClick={() => handleSelect(p)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Text strong>{p.name || `Patient/${p.id}`}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  DOB: {p.dob ?? '—'} &nbsp;·&nbsp; Gender: {p.gender ?? '—'} &nbsp;·&nbsp; ID: {p.id}
                </Text>
              </div>
            </List.Item>
          )}
        />
      </div>
    </div>
  )
}

export default RecentPatientsPanel
