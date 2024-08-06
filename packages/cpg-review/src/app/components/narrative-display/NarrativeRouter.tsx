import '@/styles/NarrativeDisplay.css'
import BrowserResolver from 'resolver/browser'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import NarrativeDisplay from './NarrativeDisplay'
import { NodeData } from '../../types/NodeData'

interface NarrativeRouterProps {

  nodeData:
    | NodeData
    | undefined
  resolver: BrowserResolver | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
}

const NarrativeRouter = ({
  nodeData,

  resolver,
  setSelectedNode,
}: NarrativeRouterProps) => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/')
  }, [nodeData])

  return (
    <div className="narrative-section">
      <Routes>
        <Route
          path="/"
          element={
            <NarrativeDisplay
              resolver={resolver}
              setSelectedNode={setSelectedNode}
              nodeDetails={nodeData}

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
