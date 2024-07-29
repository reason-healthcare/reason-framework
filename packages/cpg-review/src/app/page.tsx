'use client'
import { useState, useEffect } from 'react'
import FileResolver from './resolver/file'
import BrowserResolver from 'resolver/browser'
import FlowDisplay from './components/FlowDisplay'
import LoadIndicator from './components/LoadIndicator'
import DetailsSection from './components/DetailsSection'
import { ReactFlowProvider } from 'reactflow'
import UploadSection from './components/UploadSection'
import { InboxOutlined } from '@ant-design/icons'
import { MemoryRouter } from 'react-router-dom'

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

  // useEffect(() => {
  //   fetch('/api/content', { cache: 'no-cache' })
  //     .then((response) => response.json())
  //     .then((data) => {
  //       console.log('fetching data')
  //       setResolver(data.resolver)
  //       setPlanDefinition(data.planDefinition)
  //     })
  // }, [])

  useEffect(() => {
    const storedContent = localStorage.getItem('resolver')
    if (storedContent) {
      const browserResolver = new BrowserResolver(storedContent)
      setResolver(browserResolver)
    }
  }, [])

  useEffect(() => {
    if (resolver && resolver instanceof BrowserResolver && planDefinition) {
      setShowUpload(false)
      setShowDetails(false)
    } else {
      setShowUpload(true)
    }
  }, [resolver, planDefinition])

  const contentDisplay = (
    <>
      <div className="header">
        <h1>
          {planDefinition?.title ??
            planDefinition?.name ??
            planDefinition?.url ??
            planDefinition?.id ??
            ''}
        </h1>
        <InboxOutlined
          className="upload-icon"
          onClick={() => setShowUpload(true)}
        />
      </div>
      <div className="content-container">
        {resolver && planDefinition ? (
          <ReactFlowProvider>
            <FlowDisplay
              resolver={resolver}
              planDefinition={planDefinition}
              setDetails={setDetails}
              setShowDetails={setShowDetails}
              showDetails={showDetails}
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
