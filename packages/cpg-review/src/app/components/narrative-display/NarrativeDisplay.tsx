import '@/styles/NarrativeDisplay.css'
import BrowserResolver from 'resolver/browser'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import ResourceDetails from './ResourceDetails'

interface NarrativeDisplayProps {
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>
  details:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
  resolver: BrowserResolver | undefined
  setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
}

const NarrativeDisplay = ({
  details,
  setShowDetails,
  resolver,
  setSelected,
}: NarrativeDisplayProps) => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/')
  }, [details])

  return (
    <div className="details-section">
      <Routes>
        <Route
          path="/"
          element={
            <ResourceDetails
              resolver={resolver}
              setSelected={setSelected}
              nodeDetails={details}
              setShowDetails={setShowDetails}
            />
          }
        />
        <Route
          path="/:resourceType/:id"
          element={
            <ResourceDetails
              resolver={resolver}
              setSelected={setSelected}
              setShowDetails={setShowDetails}
            />
          }
        />
      </Routes>
    </div>
  )
}

export default NarrativeDisplay
