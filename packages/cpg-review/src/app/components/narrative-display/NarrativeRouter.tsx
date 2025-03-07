import '@/styles/narrativeDisplay.css'
import BrowserResolver from 'resolver/browser'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import NarrativeDisplay from './NarrativeDisplay'
import { NodeContent } from '@/types/NodeProps'

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

  useEffect(() => {
    navigate('/')
  }, [narrativeContent])

  return (
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
  )
}

export default NarrativeRouter
