'use client'

import { Input, List, message, Tag, Typography } from 'antd'
import { ClockCircleOutlined, ClearOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import {
  getAllPatients,
  getPackageCatalog,
  clearAll,
  addPatient,
  getPatientIdFromBundleJson,
  PatientSummary,
} from 'utils/recentPatientsStore'
import { ResourceIdentifier } from 'utils/fhirContextDeriver'
import BrowserResolver from 'resolver/browser'

const { Text } = Typography

interface PatientSelectionPanelProps {
  resolver?: BrowserResolver | undefined
  /** If provided, loads recents scoped to this endpoint URL plus package selections. */
  endpointUrl: string | undefined
  onPatientSelect: (
    subject: ResourceIdentifier,
    summary: PatientSummary,
    dataPayload?: string
  ) => void
  sourceFilter?: PatientSummary['source']
  hideClearButton?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
}

const PatientSelectionPanel = ({
  resolver,
  endpointUrl,
  onPatientSelect,
  sourceFilter,
  hideClearButton = false,
  searchPlaceholder,
  emptyMessage,
}: PatientSelectionPanelProps) => {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [searchValue, setSearchValue] = useState('')

  const reload = () => {
    if (sourceFilter === 'package') {
      setPatients(getPackageCatalog())
    } else {
      const allPatients = getAllPatients(endpointUrl)
      setPatients(
        sourceFilter
          ? allPatients.filter((patient) => patient.source === sourceFilter)
          : allPatients
      )
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointUrl])

  const handleSelect = (summary: PatientSummary) => {
    let effectiveBundleJson: string | undefined

    if (summary.source === 'package') {
      const fallbackJson =
        !summary.json && resolver
          ? JSON.stringify(
              resolver.resourcesByReference[`Bundle/${summary.id}`]
            )
          : undefined

      effectiveBundleJson = summary.json || fallbackJson

      if (!effectiveBundleJson) {
        message.error('Selected package bundle has no stored payload')
        return
      }
      try {
        JSON.parse(effectiveBundleJson)
      } catch {
        message.error('Stored package bundle is invalid JSON')
        return
      }
    }

    addPatient({
      ...summary,
      addedAt: new Date().toISOString(),
    })

    if (summary.source === 'package' && effectiveBundleJson) {
      const patientId = getPatientIdFromBundleJson(effectiveBundleJson)
      if (!patientId) {
        message.error('Could not determine patient ID from bundle')
        return
      }
      onPatientSelect({ resourceType: 'Patient', id: patientId }, summary, effectiveBundleJson)
    } else {
      onPatientSelect({ resourceType: 'Patient', id: summary.id }, summary, undefined)
    }
    reload()
  }

  const handleClear = () => {
    clearAll()
    setPatients([])
  }

  const visiblePatients = patients.filter((patient) => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return true

    const haystack = [
      patient.name,
      patient.id,
      ...(patient.source === 'package' ? (patient.resourceTypes ?? []) : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })

  if (patients.length === 0) {
    return (
      <div className="recent-patients-empty">
        <ClockCircleOutlined className="recent-patients-empty-icon" />
        <Text type="secondary">
          {emptyMessage ?? 'No recently loaded patients yet.'}
        </Text>
      </div>
    )
  }

  return (
    <div className="recent-patients-panel">
      <div className="recent-patients-toolbar">
        {searchPlaceholder ? (
          <Input
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        ) : null}
        {!hideClearButton ? (
          <button
            className="button-secondary button"
            style={{ fontSize: '0.85rem' }}
            onClick={handleClear}
          >
            <ClearOutlined /> Clear history
          </button>
        ) : null}
      </div>

      <div className="recent-patients-scroll">
        <List
          size="small"
          dataSource={visiblePatients}
          renderItem={(p) => (
            <List.Item
              className="patient-list-item"
              style={{ cursor: 'pointer' }}
              onClick={() => handleSelect(p)}
              onKeyDown={(e) => {
                e.preventDefault()
                if (e.key === 'Enter' || e.key === ' ') handleSelect(p)
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${p.name || `Patient/${p.id}`}`}
            >
              <div className="recent-patient-row">
                <div className="recent-patient-details">
                  <div className="recent-patient-name">
                    <Text strong>{p.name || `Patient/${p.id}`}</Text>
                    <Tag
                      color={
                        p.source === 'endpoint'
                          ? 'blue'
                          : p.source === 'package'
                          ? 'green'
                          : 'default'
                      }
                    >
                      {p.source === 'endpoint'
                        ? 'Data Endpoint'
                        : p.source === 'package'
                        ? 'From Package'
                        : 'FHIR Bundle'}
                    </Tag>
                  </div>
                  <Text type="secondary" className="recent-patient-meta">
                    {p.source === 'package'
                      ? `Resources: ${
                          p.resourceTypes?.join(', ') ?? '—'
                        } · Count: ${p.resourceCount ?? 0}`
                      : `DOB: ${p.dob ?? '—'} · Gender: ${
                          p.gender ?? '—'
                        } · ID: ${p.id}`}
                  </Text>
                </div>

                <button
                  type="button"
                  className="button-simple"
                  style={{ minWidth: 88 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(p)
                  }}
                  tabIndex={-1}
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

export default PatientSelectionPanel
