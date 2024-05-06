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
  const [selected, setSelected] = useState<Node | undefined>()

  useEffect(() => {
    fetch('/api/content', { cache: 'no-cache' })
      .then((response) => response.json())
      .then((data) => {
        console.log('fetching data')
        setResolver(data.resolver)
        setPlanDefinition(data.planDefinition)
      })
  }, [])

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
              selected={selected}
              setSelected={setSelected}
            />
          </ReactFlowProvider>
        ) : (
          <LoadIndicator />
        )}
        {selected ? (
          <DetailsSection
            setSelected={setSelected}
            selected={selected}
          ></DetailsSection>
        ) : null}
      </div>
    </div>
  )
}
