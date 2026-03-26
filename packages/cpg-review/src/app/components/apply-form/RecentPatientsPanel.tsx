'use client'

import { List, Tag, Typography } from 'antd'
import { ClockCircleOutlined, ClearOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import {
  getAllPatients,
  clearAll,
  addPatient,
  PatientSummary,
} from 'utils/recentPatientsStore'

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
    addPatient({
      ...summary,
      addedAt: new Date().toISOString(),
    })
    onPatientSelect(`Patient/${summary.id}`, summary)
    reload()
  }

  const handleClear = () => {
    clearAll()
    setPatients([])
  }

  if (patients.length === 0) {
    return (
      <div className="recent-patients-empty">
        <ClockCircleOutlined className="recent-patients-empty-icon" />
        <Text type="secondary">No recently loaded patients yet.</Text>
      </div>
    )
  }

  return (
    <div className="recent-patients-panel">
      <div className="recent-patients-toolbar">
        <button
          className="button-secondary button"
          style={{ fontSize: '0.85rem' }}
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
              style={{ cursor: 'default' }}
            >
              <div className="recent-patient-row">
                <div className="recent-patient-details">
                  <div className="recent-patient-name">
                    <Text strong>{p.name || `Patient/${p.id}`}</Text>
                    <Tag color={p.source === 'endpoint' ? 'blue' : 'default'}>
                      {p.source === 'endpoint' ? 'Data Endpoint' : 'FHIR Bundle'}
                    </Tag>
                  </div>
                  <Text type="secondary" className="recent-patient-meta">
                    DOB: {p.dob ?? '—'} &nbsp;·&nbsp; Gender: {p.gender ?? '—'} &nbsp;·&nbsp; ID: {p.id}
                  </Text>
                </div>

                <button
                  type="button"
                  className="button-simple"
                  style={{ minWidth: 88, backgroundColor: '&hover: var(--drLightBlue)'}}
                  onClick={() => handleSelect(p)}
                  aria-label={`Select ${p.name || `Patient/${p.id}`}`}
                >
                  Select
                </button>
              </div>
            </List.Item>
          )}
        />
      </div>
    </div>
  )
}

export default RecentPatientsPanel
