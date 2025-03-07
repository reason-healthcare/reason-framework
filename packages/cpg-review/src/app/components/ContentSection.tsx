import { MemoryRouter } from 'react-router-dom'
import ApplyForm from './apply-form/ApplyForm'
import NarrativeRouter from './narrative-display/NarrativeRouter'
import ContentHeader from './ContentHeader'
import { Panel, PanelGroup } from 'react-resizable-panels'
import { ReactFlowProvider } from 'reactflow'
import FlowDisplay from './flow-display/FlowDisplay'
import LoadIndicator from './LoadIndicator'
import SidePanel from './SidePanel'
import { SidePanelView } from 'page'
import { NodeContent } from '@/types/NodeProps'
import BrowserResolver from 'resolver/browser'
import { useEffect, useState } from 'react'
import '@/styles/contentSection.css'

interface ContentSectionProps {
  resolver: BrowserResolver | undefined
  planDefinition: fhir4.PlanDefinition | undefined
  narrativeContent: NodeContent | undefined
  setNarrativeContent: React.Dispatch<
    React.SetStateAction<NodeContent | undefined>
  >
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView>>
  sidePanelView: SidePanelView
  endpointPayload: string | undefined
  selectedNode: string | undefined
}

const ContentSection = ({
  resolver,
  planDefinition,
  narrativeContent,
  setNarrativeContent,
  setSelectedNode,
  setSidePanelView,
  sidePanelView,
  endpointPayload,
  selectedNode,
}: ContentSectionProps) => {
  const [requestsBundle, setRequestsBundle] = useState<
    fhir4.Bundle | undefined
  >()

  const [contextReference, setContextReference] = useState<string | undefined>()

  useEffect(() => {
    if (contextReference == null) {
      setRequestsBundle(undefined)
    }
  }, [contextReference])

  const renderSidePanelContent = () => {
    if (sidePanelView === 'apply' && planDefinition) {
      return (
        <ApplyForm
          planDefinition={planDefinition}
          contentEndpoint={endpointPayload}
          setRequestsBundle={setRequestsBundle}
          setContextReference={setContextReference}
          setSidePanelView={setSidePanelView}
        />
      )
    }

    if (sidePanelView === 'narrative') {
      return (
        <MemoryRouter>
          <NarrativeRouter
            narrativeContent={narrativeContent}
            resolver={resolver}
            setSelectedNode={setSelectedNode}
          />
        </MemoryRouter>
      )
    }

    return null
  }

  return (
    <PanelGroup direction="horizontal" className="data-panel-group">
      <Panel minSize={25}>
        <ContentHeader
          planDefinition={planDefinition}
          requestsBundle={requestsBundle}
          contextReference={contextReference}
          setSidePanelView={setSidePanelView}
          setRequestsBundle={setRequestsBundle}
        />
        {resolver != null && planDefinition != null ? (
          <ReactFlowProvider>
            <FlowDisplay
              resolver={resolver}
              planDefinition={planDefinition}
              setNarrativeContent={setNarrativeContent}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              setSidePanelView={setSidePanelView}
              requestsBundle={requestsBundle}
            />
          </ReactFlowProvider>
        ) : (
          <LoadIndicator />
        )}
      </Panel>
      {sidePanelView != undefined && (
        <SidePanel setSidePanelView={setSidePanelView}>
          {renderSidePanelContent()}
        </SidePanel>
      )}
    </PanelGroup>
  )
}

export default ContentSection
