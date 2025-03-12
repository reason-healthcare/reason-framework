import '@/styles/narrativeDisplay.css'
import BrowserResolver from 'resolver/browser'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import NarrativeDisplay from './NarrativeDisplay'
import { NodeContent } from '../../types/NodeProps'
import SidePanel from '../SidePanel'
import BackButton from '../BackButton'

interface NarrativeRouterProps {
  narrativeContent: NodeContent | undefined
  resolver: BrowserResolver | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  setShowNarrativeContent: React.Dispatch<React.SetStateAction<boolean>>
}

const NarrativeRouter = ({
  narrativeContent,
  resolver,
  setSelectedNode,
  setShowNarrativeContent,
}: NarrativeRouterProps) => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/')
  }, [narrativeContent])

  return (
    <SidePanel
      setShowSidePanel={setShowNarrativeContent}
      navigation={<BackButton />}
    >
      <Routes>
        <Route
          path="/"
          element={
            <NarrativeDisplay
              resolver={resolver}
              setSelectedNode={setSelectedNode}
              narrativeContent={narrativeContent}
              setShowNarrativeContent={setShowNarrativeContent}
            />
          }
        />
        <Route
          path="/:resourceType/:id"
          element={
            <NarrativeDisplay
              resolver={resolver}
              setSelectedNode={setSelectedNode}
              setShowNarrativeContent={setShowNarrativeContent}
            />
          }
        />
      </Routes>
    </SidePanel>
  )
}

export default NarrativeRouter
