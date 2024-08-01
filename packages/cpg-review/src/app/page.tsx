'use client'
import { useState, useEffect } from 'react'
import BrowserResolver from './resolver/browser'
import FlowDisplay from './components/FlowDisplay'
import LoadIndicator from './components/LoadIndicator'
import DetailsSection from './components/DetailsSection'
import { ReactFlowProvider } from 'reactflow'
import UploadSection from './components/UploadSection'
import { InboxOutlined } from '@ant-design/icons'
import { MemoryRouter } from 'react-router-dom'
import { formatTitle } from 'helpers'

export default function Home() {
  const [resolver, setResolver] = useState<BrowserResolver | undefined>()
  const [planDefinition, setPlanDefinition] = useState<
    fhir4.PlanDefinition | undefined
  >()
  const [details, setDetails] = useState<
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
  >()
  const [showDetails, setShowDetails] = useState<boolean>(false)
  const [showUpload, setShowUpload] = useState<boolean>(false)
  const [selected, setSelected] = useState<string>()

  useEffect(() => {
    const storedContent = localStorage.getItem('resolver')
    if (storedContent) {
      const browserResolver = new BrowserResolver(storedContent)
      setResolver(browserResolver)
    }
  }, [])

  useEffect(() => {
    if (resolver instanceof BrowserResolver && planDefinition != null) {
      setShowUpload(false)
      setShowDetails(false)
    } else {
      setShowUpload(true)
    }
  }, [resolver, planDefinition])

  const contentDisplay = (
    <>
      <div className="header">
        {resolver != null && planDefinition != null && (
          <>
            <h1>
              {formatTitle(planDefinition)}
            </h1>
            <InboxOutlined
              className="upload-icon"
              onClick={() => setShowUpload(true)}
            />
          </>
        )}
      </div>
      <div className="content-container">
        {resolver != null && planDefinition != null ? (
          <ReactFlowProvider>
            <FlowDisplay
              resolver={resolver}
              planDefinition={planDefinition}
              setDetails={setDetails}
              setShowDetails={setShowDetails}
              showDetails={showDetails}
              selected={selected}
              setSelected={setSelected}
            />
          </ReactFlowProvider>
        ) : (
          <LoadIndicator />
        )}
        <MemoryRouter>
          {showDetails && (
            <DetailsSection
              details={details}
              resolver={resolver}
              setShowDetails={setShowDetails}
              setSelected={setSelected}
            ></DetailsSection>
          )}
        </MemoryRouter>
      </div>
    </>
  )

  return (
    <div className="app-container">
      {!showUpload ? (
        contentDisplay
      ) : (
        <UploadSection
          setResolver={setResolver}
          setPlanDefinition={setPlanDefinition}
          resolver={resolver}
        />
      )}
    </div>
  )
}
