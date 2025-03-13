import '@/styles/narrativeDisplay.css'
import BrowserResolver from 'resolver/browser'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import NarrativeDisplay from './NarrativeDisplay'
import SidePanel from '../SidePanel'
import BackButton from '../BackButton'
import { SidePanelView } from 'page'
import { Node } from 'reactflow'
import { NodeContent } from '@/types/NodeProps'

interface NarrativeRouterProps {
  narrativeContent: NodeContent | undefined
  resolver: BrowserResolver | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView>>
}

const NarrativeRouter = ({
  narrativeContent,
  resolver,
  setSelectedNode,
  setSidePanelView,
}: NarrativeRouterProps) => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/')
  }, [narrativeContent])

  return (
    <SidePanel setSidePanelView={setSidePanelView} navigation={<BackButton />}>
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
    </SidePanel>
  )
}

export default NarrativeRouter
