'use client'
import { useState, useEffect } from 'react'
import FileResolver from './resolver/file'
import FlowDisplay from './components/FlowDisplay'
import LoadIndicator from './components/LoadIndicator'
// import Image from 'next/image'
// import reasonLogo from '../../public/images/reason-health-logo.svg'

export default function Home() {
  const [resolver, setResolver] = useState<FileResolver | undefined>()
  const [planDefinition, setPlanDefinition] = useState<fhir4.PlanDefinition | undefined>()

  useEffect(() => {
    fetch('/api/content', {cache: 'no-cache'})
      .then((response) => response.json())
      .then((data) => {
        setResolver(data.resolver)
        setPlanDefinition(data.planDefinition)
      })
  }, [])

  return (
    <div className='app-container'>
      <div className='header'>
        <h1>{planDefinition?.title}</h1>
        {/* <Image width="150" height='150' alt='reason healthcare logo' src={reasonLogo}></Image> */}
      </div>
      {resolver && planDefinition ? <FlowDisplay resolver={resolver} planDefinition={planDefinition} /> : <LoadIndicator/>}
    </div>
  )
}
