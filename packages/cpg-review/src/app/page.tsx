'use client'
import { useState, useEffect } from 'react'
import BrowserResolver from './resolver/browser'
import FlowDisplay from './components/flow-display/FlowDisplay'
import LoadIndicator from './components/LoadIndicator'
import NarrativeRouter from './components/narrative-display/NarrativeRouter'
import { ReactFlowProvider } from 'reactflow'
import UploadSection, {
  PlanDefinitionSelectionOption,
  UploadSectionProps,
} from './components/UploadSection'
import { MemoryRouter } from 'react-router-dom'
import { formatTitle } from 'helpers'
import { NodeContent } from './types/NodeProps'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { UploadFile } from 'antd'
import Nav, { NavProps } from './components/Nav'

export default function Page() {
  const [resolver, setResolver] = useState<BrowserResolver | undefined>()
  const [planDefinition, setPlanDefinition] = useState<
    fhir4.PlanDefinition | undefined
  >()
  const [narrativeContent, setNarrativeContent] = useState<
    NodeContent | undefined
  >()
  const [showUploadPage, setShowUploadPage] = useState<boolean>(false)
  const [selectedNode, setSelectedNode] = useState<string>()

  /** Page.tsx manages upload form payload to preserve form after submit */
  const [packageTypePayload, setPackageTypePayload] = useState<string>('file')
  const [endpointPayload, setEndpointPayload] = useState<string | undefined>()
  const [fileList, setFileList] = useState<UploadFile<any>[]>([])
  const [planDefinitionSelectionOptions, setPlanDefinitionSelectionOptions] =
    useState<PlanDefinitionSelectionOption[]>()
  const [planDefinitionPayload, setPlanDefinitionPayload] = useState<
    string | undefined
  >()

  useEffect(() => {
    const storedContent = localStorage.getItem('resolver')
    const storedPlan = localStorage.getItem('planDefinition')
    if (storedContent != null) {
      const browserResolver = new BrowserResolver(storedContent)
      setResolver(browserResolver)
      if (storedPlan != null) {
        setPlanDefinition(JSON.parse(storedPlan))
      }
    }
  }, [])

  useEffect(() => {
    setSelectedNode(undefined)
    setNarrativeContent(undefined)
    if (resolver instanceof BrowserResolver && planDefinition != null) {
      setShowUploadPage(false)
    } else {
      setShowUploadPage(true)
    }
  }, [resolver, planDefinition])

  const uploadSectionProps: UploadSectionProps = {
    setResolver,
    setPlanDefinition,
    resolver,
    packageTypePayload,
    setPackageTypePayload,
    endpointPayload,
    setEndpointPayload,
    fileList,
    setFileList,
    planDefinitionSelectionOptions,
    setPlanDefinitionSelectionOptions,
    planDefinitionPayload,
    setPlanDefinitionPayload,
    setShowUploadPage,
  }

  const navProps: NavProps = {
    resolver,
    planDefinition,
    showUploadPage,
    setShowUploadPage,
  }

  const contentDisplay = (
    <>
      <div className="plan-title">
        {planDefinition != null && <h1>{formatTitle(planDefinition)}</h1>}
      </div>
      <PanelGroup direction="horizontal" className="data-panel-group">
        <Panel minSize={25}>
          {resolver != null && planDefinition != null ? (
            <ReactFlowProvider>
              <FlowDisplay
                resolver={resolver}
                planDefinition={planDefinition}
                setNarrativeContent={setNarrativeContent}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
              />
            </ReactFlowProvider>
          ) : (
            <LoadIndicator />
          )}
        </Panel>
        {selectedNode != null && (
          <>
            <PanelResizeHandle className="panel-separator" />
            <Panel minSize={25}>
              <MemoryRouter>
                {selectedNode != null && (
                  <NarrativeRouter
                    narrativeContent={narrativeContent}
                    resolver={resolver}
                    setSelectedNode={setSelectedNode}
                  ></NarrativeRouter>
                )}
              </MemoryRouter>
            </Panel>
          </>
        )}
      </PanelGroup>
    </>
  )

  return (
    <div className="app-container">
      <div className="header-container">
        <Nav {...navProps} />
      </div>
      <div className="content-container">
        {!showUploadPage ? (
          contentDisplay
        ) : (
          <UploadSection {...uploadSectionProps} />
        )}
      </div>
    </div>
  )
}
