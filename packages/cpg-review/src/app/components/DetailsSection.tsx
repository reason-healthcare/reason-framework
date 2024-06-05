import '@/styles/detailsSection.css'
import { CloseOutlined } from '@ant-design/icons'
import FileResolver from 'resolver/file'
import BrowserResolver from 'resolver/browser'
import NodeDetails from './NodeDetails'
import { Route, Routes, MemoryRouter } from 'react-router-dom'
import InputDetails from './InputDetails'
import LibraryDetails from './LibraryDetails'

interface DetailsSectionProps {
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>
  details:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
  resolver: FileResolver | BrowserResolver | undefined
}

const DetailsSection = ({
  details,
  setShowDetails,
  resolver,
}: DetailsSectionProps) => {
  const handleClick = () => {
    setShowDetails(false)
  }

  return (
    <div className="details-section">
      <div className="close">
        <CloseOutlined onClick={handleClick} />
      </div>
      <MemoryRouter>
        <div className="details-container">
          <Routes>
            <Route
              path="/"
              element={<NodeDetails details={details} resolver={resolver} />}
            />
            <Route
              path="/StructureDefinition/:id"
              element={<InputDetails resolver={resolver} />}
            />
            <Route
              path="/Library/:id"
              element={<LibraryDetails resolver={resolver} />}
            />
          </Routes>
        </div>
      </MemoryRouter>
    </div>
  )
}

export default DetailsSection
