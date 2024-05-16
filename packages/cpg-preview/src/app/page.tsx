'use client'
import { useState, useEffect } from 'react'
import FileResolver from './resolver/file'
import FlowDisplay from './components/FlowDisplay'
import LoadIndicator from './components/LoadIndicator'
import DetailsSection from './components/DetailsSection'
import { Node, ReactFlowProvider } from 'reactflow'

export default function Home() {
  const [resolver, setResolver] = useState<FileResolver | undefined>()
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
  const [viewport, setViewport] = useState<boolean>(false)

  useEffect(() => {
    fetch('/api/content', { cache: 'no-cache' })
      .then((response) => response.json())
      .then((data) => {
        console.log('fetching data')
        setResolver(data.resolver)
        setPlanDefinition(data.planDefinition)
      })
  }, [])

  useEffect(() => {
    setViewport(true)
  }, [showDetails])

  return (
    <div className="app-container">
      <div className="header">
        <h1>{planDefinition?.title}</h1>
        {/* <Image width="150" height='150' alt='reason healthcare logo' src={reasonLogo}></Image> */}
      </div>
      <div className="content-container">
        {resolver && planDefinition ? (
          <ReactFlowProvider>
            <FlowDisplay
              resolver={resolver}
              planDefinition={planDefinition}
              setDetails={setDetails}
              setShowDetails={setShowDetails}
            />
          </ReactFlowProvider>
        ) : (
          <LoadIndicator />
        )}
        {showDetails ? (
          <DetailsSection
            details={details}
            resolver={resolver}
            setShowDetails={setShowDetails}
          ></DetailsSection>
        ) : null}
      </div>
    </div>
  )
}
