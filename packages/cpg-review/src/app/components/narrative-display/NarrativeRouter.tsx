import '@/styles/NarrativeDisplay.css'
import BrowserResolver from 'resolver/browser'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import NarrativeDisplay from './NarrativeDisplay'
import { NodeContent } from '../../types/NodeProps'

interface NarrativeRouterProps {
  narrativeContent: NodeContent | undefined
  resolver: BrowserResolver | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
}

const NarrativeRouter = ({
  narrativeContent,
  resolver,
  setSelectedNode,
}: NarrativeRouterProps) => {
  const navigate = useNavigate()

  /** Node data includes the resource or action that the node represents. In the case of an action, preference to track and display the data as opposed to resolving the action via action title/id. Action titles and Ids are not required and are not always unique. */
  useEffect(() => {
    navigate('/')
  }, [narrativeContent])

  return (
    <div className="narrative-section">
      <Routes>
        <Route
          path="/"
          element={
            <NarrativeDisplay
              resolver={resolver}
              setSelectedNode={setSelectedNode}
              narrativeContent={narrativeContent}
            />
          }
        />
        <Route
          path="/:resourceType/:id"
          element={
            <NarrativeDisplay
              resolver={resolver}
              setSelectedNode={setSelectedNode}
            />
          }
        />
      </Routes>
    </div>
  )
}

export default NarrativeRouter
