'use client'
import { useState, useEffect } from 'react'
import BrowserResolver from './resolver/browser'
import FlowDisplay from './components/flow-display/FlowDisplay'
import LoadIndicator from './components/LoadIndicator'
import NarrativeDisplay from './components/narrative-display/NarrativeDisplay'
import { ReactFlowProvider } from 'reactflow'
import UploadSection from './components/UploadSection'
import { MemoryRouter } from 'react-router-dom'
import { formatTitle } from 'helpers'
import Link from 'next/link'

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
      <div className="plan-title">
        {planDefinition != null &&
          <h1>
            {formatTitle(planDefinition)}
          </h1>
        }
      </div>
      <div className="flow-provider-container">
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
            <NarrativeDisplay
              details={details}
              resolver={resolver}
              setShowDetails={setShowDetails}
              setSelected={setSelected}
            ></NarrativeDisplay>
          )}
        </MemoryRouter>
      </div>
    </>
  )

  return (
    <div className='app-container'>
      <div className="header-container">
        <Link href="https://www.vermonster.com/products" target="_blank" aria-label='visit reason healthcare' className='logo'><span className='r'>r</span><span>.</span><span>h</span></Link>
        <div className="links">
          {!showUpload && <button className='upload-link' aria-label='add new plan' onClick={() => setShowUpload(true)}>
            New
          </button>}
          <Link href="https://github.com/reason-healthcare/reason-framework" target="_blank" className='upload-link' aria-label='documentation'>
            Docs
          </Link>
        </div>
      </div>
      <div className="content-container">
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
    </div>
  )
}
