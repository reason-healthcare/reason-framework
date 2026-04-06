import { Collapse, Input } from 'antd'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

const STORAGE_KEY = 'endpointsConfig'

const DEFAULTS = {
  cpgEngineEndpoint: 'http://localhost:8080/fhir/PlanDefinition/$r5.apply',
  contentEndpoint: 'http://localhost:8080/fhir',
  txEndpoint: 'http://localhost:8080/fhir',
  dataEndpoint: 'http://localhost:8080/fhir',
}

export interface EndpointsConfig {
  cpgEngineEndpoint: string
  contentEndpoint: string
  txEndpoint: string
  dataEndpoint: string
}

export interface EndpointsConfigurationHandle {
  reset: () => void
}

interface EndpointsConfigurationProps {
  onCpgEngineEndpointChange: (val: string) => void
  onContentEndpointChange: (val: string) => void
  onTxEndpointChange: (val: string) => void
  onDataEndpointChange: (val: string) => void
}

function loadFromStorage(): EndpointsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return { ...DEFAULTS, ...JSON.parse(raw) }
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULTS }
}

// TODO(fhir-terminology-server-auth): extend endpointsConfig with auth credentials here
function persistConfig(config: EndpointsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

function isConfigComplete(config: EndpointsConfig) {
  return [
    config.cpgEngineEndpoint,
    config.contentEndpoint,
    config.txEndpoint,
    config.dataEndpoint,
  ].every((value) => value.trim().length > 0)
}

const EndpointsConfiguration = forwardRef<
  EndpointsConfigurationHandle,
  EndpointsConfigurationProps
>(function EndpointsConfiguration(
  {
    onCpgEngineEndpointChange,
    onContentEndpointChange,
    onTxEndpointChange,
    onDataEndpointChange,
  },
  ref
) {
  const [config, setConfig] = useState<EndpointsConfig>(loadFromStorage)
  const [activeKey, setActiveKey] = useState<string[]>(() =>
    isConfigComplete(loadFromStorage()) ? [] : ['endpoints']
  )

  // Notify parent of initial values (which may come from localStorage)
  useEffect(() => {
    onCpgEngineEndpointChange(config.cpgEngineEndpoint)
    onContentEndpointChange(config.contentEndpoint)
    onTxEndpointChange(config.txEndpoint)
    onDataEndpointChange(config.dataEndpoint)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    reset() {
      localStorage.removeItem(STORAGE_KEY)
      const fresh = { ...DEFAULTS }
      setConfig(fresh)
      onCpgEngineEndpointChange(fresh.cpgEngineEndpoint)
      onContentEndpointChange(fresh.contentEndpoint)
      onTxEndpointChange(fresh.txEndpoint)
      onDataEndpointChange(fresh.dataEndpoint)
    },
  }))

  function updateField(
    field: keyof EndpointsConfig,
    value: string,
    cb: (val: string) => void
  ) {
    const next = { ...config, [field]: value }
    setConfig(next)
    persistConfig(next)
    cb(value)
  }

  const collapseItems = [
    {
      key: 'endpoints',
      label: (
        <div>
          <span className="endpoints-config-title">
            FHIR Endpoints Configuration
          </span>
        </div>
      ),
      children: (
        <div className="endpoints-config-fields">
          <div className="endpoints-config-field">
            <h3 className="form-title">Data Endpoint</h3>
            <p className="form-description">
              FHIR server used as the <code>dataEndpoint</code> for{' '}
              <code>$apply</code>. Used to search for patients and to supply
              clinical data to the CPG engine.
            </p>
            <Input
              placeholder="http://localhost:8080/fhir"
              value={config.dataEndpoint}
              onChange={(e) =>
                updateField(
                  'dataEndpoint',
                  e.target.value,
                  onDataEndpointChange
                )
              }
            />
          </div>

          <div className="endpoints-config-field">
            <h3 className="form-title">CPG Engine Endpoint</h3>
            <p className="form-description">
              Endpoint for PlanDefinition $apply operations
            </p>
            <Input
              placeholder="http://localhost:8080/fhir/PlanDefinition/$r5.apply"
              value={config.cpgEngineEndpoint}
              onChange={(e) =>
                updateField(
                  'cpgEngineEndpoint',
                  e.target.value,
                  onCpgEngineEndpointChange
                )
              }
            />
          </div>

          <div className="endpoints-config-field">
            <h3 className="form-title">Content Endpoint</h3>
            <p className="form-description">
              FHIR server for content resources
            </p>
            <Input
              placeholder="http://localhost:8080/fhir"
              value={config.contentEndpoint}
              onChange={(e) =>
                updateField(
                  'contentEndpoint',
                  e.target.value,
                  onContentEndpointChange
                )
              }
            />
          </div>

          <div className="endpoints-config-field">
            <h3 className="form-title">Terminology Endpoint</h3>
            <p className="form-description">
              FHIR terminology server for value set expansion and code
              validation
            </p>
            <Input
              placeholder="http://localhost:8080/fhir"
              value={config.txEndpoint}
              onChange={(e) =>
                updateField('txEndpoint', e.target.value, onTxEndpointChange)
              }
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <Collapse
      activeKey={activeKey}
      onChange={(keys) => setActiveKey(keys as string[])}
      items={collapseItems}
      className="endpoints-config-collapse"
    />
  )
})

export default EndpointsConfiguration
