'use client'

import { Segmented, Tooltip, Typography } from 'antd'
import { useEffect, useState } from 'react'
import FhirPatientSearchPanel from 'components/apply-form/FhirPatientSearchPanel'
import PatientSelectionPanel from 'components/apply-form/PatientSelectionPanel'
import {
  getAllPatients,
  getPackageCatalog,
  PatientSummary,
} from 'utils/recentPatientsStore'
import { ResourceIdentifier } from 'utils/fhirContextDeriver'
import BrowserResolver from 'resolver/browser'

const { Text } = Typography

const SESSION_KEY = 'cpg-review:patient-load-mode'
type SegmentKey = 'bundle' | 'fhir' | 'recent'

interface PatientLoadModeSwitcherProps {
  resolver?: BrowserResolver | undefined
  dataEndpointUrl: string | undefined
  onPatientSelect: (
    subject: ResourceIdentifier,
    summary: PatientSummary,
    dataPayload?: string
  ) => void
}

const PatientLoadModeSwitcher = ({
  resolver,
  dataEndpointUrl,
  onPatientSelect,
}: PatientLoadModeSwitcherProps) => {
  const [activeKey, setActiveKey] = useState<SegmentKey>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(SESSION_KEY)
      // Map legacy 'manual' mode to 'bundle' mode
      if (stored === 'manual') return 'bundle'
      return (stored as SegmentKey) ?? 'bundle'
    }
    return 'bundle'
  })

  const hasEndpoint = !!dataEndpointUrl?.trim()
  const hasPackageBundles = getPackageCatalog().length > 0
  const hasRecents = getAllPatients(dataEndpointUrl).length > 0

  // If the stored segment is no longer valid, fall back to the next available mode.
  useEffect(() => {
    if (activeKey === 'fhir' && !hasEndpoint) {
      setActiveKey(
        hasPackageBundles ? 'bundle' : hasRecents ? 'recent' : 'bundle'
      )
      return
    }

    if (activeKey === 'bundle' && !hasPackageBundles) {
      setActiveKey(hasEndpoint ? 'fhir' : hasRecents ? 'recent' : 'bundle')
    }
  }, [hasEndpoint, hasPackageBundles, hasRecents, activeKey])

  const handleChange = (key: string | number) => {
    const k = key as SegmentKey
    setActiveKey(k)
    sessionStorage.setItem(SESSION_KEY, k)
  }

  const options = [
    {
      value: 'bundle',
      label: (
        <Tooltip
          title={
            !hasPackageBundles
              ? 'No package bundles available from uploaded content'
              : undefined
          }
          style={{ fontSize: '0.9rem' }}
        >
          <span>FHIR Bundle</span>
        </Tooltip>
      ),
      disabled: !hasPackageBundles,
    },
    {
      value: 'fhir',
      label: (
        <Tooltip
          title={
            !hasEndpoint
              ? 'Configure a data endpoint to enable patient search'
              : undefined
          }
          style={{ fontSize: '0.9rem' }}
        >
          <span>FHIR Data Endpoint</span>
        </Tooltip>
      ),
      disabled: !hasEndpoint,
    },
    {
      value: 'recent',
      label: (
        <Tooltip
          title={!hasRecents ? 'No recently loaded patients' : undefined}
          style={{ fontSize: '0.9rem' }}
        >
          <span>Recent</span>
        </Tooltip>
      ),
      disabled: !hasRecents,
    },
  ]

  return (
    <div className="patient-mode-switcher">
      <Segmented
        value={activeKey}
        onChange={handleChange}
        options={options}
        block
      />

      {activeKey === 'bundle' && hasPackageBundles && (
        <div className="patient-mode-bundle-panel">
          <div>
            <h3 className="form-title">FHIR Bundle Select</h3>
            <p className="form-description">
              Select a patient bundle from the uploaded package. Each bundle is
              listed separately.
            </p>
            <PatientSelectionPanel
              resolver={resolver}
              endpointUrl={dataEndpointUrl}
              onPatientSelect={onPatientSelect}
              sourceFilter="package"
              hideClearButton
              searchPlaceholder="Search bundles"
              emptyMessage="No package bundles available in the uploaded content."
            />
          </div>
        </div>
      )}

      {activeKey === 'fhir' && hasEndpoint && (
        <div className="patient-mode-fhir-panel">
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
        <PatientSelectionPanel
          resolver={resolver}
          endpointUrl={dataEndpointUrl}
          onPatientSelect={onPatientSelect}
        />
      )}
    </div>
  )
}

export default PatientLoadModeSwitcher
