import '@/styles/NarrativeDisplay.css'
import { CloseOutlined } from '@ant-design/icons'
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

  const handleClick = () => {
    setShowDetails(false)
  }

  return (
    <div className="details-section">
      <div className="close">
        <CloseOutlined onClick={handleClick} />
      </div>
      <div className="details-container">
        <Routes>
          <Route
            path="/"
            element={
              <ResourceDetails
                resolver={resolver}
                setSelected={setSelected}
                nodeDetails={details}
              />
            }
          />
          <Route
            path="/:resourceType/:id"
            element={
              <ResourceDetails resolver={resolver} setSelected={setSelected} />
            }
          />
        </Routes>
      </div>
    </div>
  )
}

export default NarrativeDisplay
