import '@/styles/NarrativeDisplay.css'
import BrowserResolver from 'resolver/browser'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import NarrativeDisplay from './NarrativeDisplay'

interface NarrativeRouterProps {
  setShowNarrative: React.Dispatch<React.SetStateAction<boolean>>
  json:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
  resolver: BrowserResolver | undefined
  setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
}

const NarrativeRouter = ({
  json,
  setShowNarrative,
  resolver,
  setSelected,
}: NarrativeRouterProps) => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/')
  }, [json])

  return (
    <div className="narrative-section">
      <Routes>
        <Route
          path="/"
          element={
            <NarrativeDisplay
              resolver={resolver}
              setSelected={setSelected}
              nodeDetails={json}
              setShowNarrative={setShowNarrative}
            />
          }
        />
        <Route
          path="/:resourceType/:id"
          element={
            <NarrativeDisplay
              resolver={resolver}
              setSelected={setSelected}
              setShowNarrative={setShowNarrative}
            />
          }
        />
      </Routes>
    </div>
  )
}

export default NarrativeRouter
