import '@/styles/detailsSection.css'
import { CloseOutlined } from '@ant-design/icons'
import BrowserResolver from 'resolver/browser'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import ResourceDetails from './ResourceDetails'

interface DetailsSectionProps {
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>
  details:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
  resolver: BrowserResolver | undefined
}

const DetailsSection = ({
  details,
  setShowDetails,
  resolver,
}: DetailsSectionProps) => {
  let navigate = useNavigate()
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
              <ResourceDetails resolver={resolver} nodeDetails={details} />
            }
          />
          <Route
            path="/:resourceType/:id"
            element={<ResourceDetails resolver={resolver} />}
          />
        </Routes>
      </div>
    </div>
  )
}

export default DetailsSection
