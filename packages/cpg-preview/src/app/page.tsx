'use client'
import { useState, useEffect } from 'react'
import FileResolver from './resolver/file'
import BrowserResolver from 'resolver/browser'
import FlowDisplay from './components/FlowDisplay'
import LoadIndicator from './components/LoadIndicator'
import DetailsSection from './components/DetailsSection'
import { ReactFlowProvider } from 'reactflow'
import UploadSection from './components/UploadSection'
// import { UploadOutlined } from '@ant-design/icons'
import { InboxOutlined } from '@ant-design/icons'

export default function Home() {
  const [resolver, setResolver] = useState<
    FileResolver | BrowserResolver | undefined
  >()
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
      const content = JSON.parse(storedContent)
      setResolver(
        new BrowserResolver(content.resourcesByCanonical, content.pathway)
      )
    }
  }, [])

  useEffect(() => {
    if (resolver && resolver instanceof BrowserResolver) {
      setPlanDefinition(resolver.pathway)
      setShowUpload(false)
      setShowDetails(false)
    }
  }, [resolver])

  const contentDisplay = (
    <>
      <div className="header">
        <h1>{planDefinition?.title}</h1>
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
        {showDetails && (
          <DetailsSection
            details={details}
            resolver={resolver}
            setShowDetails={setShowDetails}
          ></DetailsSection>
        )}
      </div>
    </>
  )

  return (
    <div className="app-container">
      {!showUpload ? (
        contentDisplay
      ) : (
        <UploadSection setResolver={setResolver} />
      )}
    </div>
  )
}
