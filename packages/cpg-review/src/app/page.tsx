'use client'
import { useState, useEffect } from 'react'
import BrowserResolver from './resolver/browser'
import FlowDisplay from './components/flow-display/FlowDisplay'
import LoadIndicator from './components/LoadIndicator'
import NarrativeRouter from './components/narrative-display/NarrativeRouter'
import { ReactFlowProvider } from 'reactflow'
import UploadSection, { UploadSectionProps } from './components/UploadSection'
import { MemoryRouter } from 'react-router-dom'
import { formatTitle } from 'helpers'
import Link from 'next/link'
import { NodeData } from './types/NodeData'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { UploadFile } from 'antd'

export default function Home() {
  const [resolver, setResolver] = useState<BrowserResolver | undefined>()
  const [planDefinition, setPlanDefinition] = useState<
    fhir4.PlanDefinition | undefined
  >()
  const [nodeData, setNodeData] = useState<NodeData | undefined>()
  const [showUpload, setShowUpload] = useState<boolean>(false)
  const [selectedNode, setSelectedNode] = useState<string>()

  const [packageTypePayload, setPackageTypePayload] = useState<string>('file')
  const [endpointPayload, setEndpointPayload] = useState<string | undefined>()
  const [fileList, setFileList] = useState<UploadFile<any>[]>([])
  const [planDefinitionSelectionOptions, setPlanDefinitionSelectionOptions] =
    useState<fhir4.PlanDefinition[]>()
  const [planDefinitionPayload, setPlanDefinitionPayload] = useState<
    string | undefined
  >()

  useEffect(() => {
    const storedContent = localStorage.getItem('resolver')
    const storedPlan = localStorage.getItem('planDefinition')
    if (storedContent) {
      const browserResolver = new BrowserResolver(storedContent)
      setResolver(browserResolver)
      if (storedPlan) {
        setPlanDefinition(JSON.parse(storedPlan))
      }
    }
  }, [])

  useEffect(() => {
    setSelectedNode(undefined)
    if (resolver instanceof BrowserResolver && planDefinition != null) {
      setShowUpload(false)
    } else {
      setShowUpload(true)
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
                setNodeData={setNodeData}
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
            <PanelResizeHandle className="panel-seperator" />
            <Panel minSize={25}>
              <MemoryRouter>
                {selectedNode != null && (
                  <NarrativeRouter
                    nodeData={nodeData}
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
        <Link
          href="https://www.vermonster.com/products"
          target="_blank"
          aria-label="visit reason healthcare"
          className="logo"
        >
          <span className="r">r</span>
          <span>.</span>
          <span>h</span>
        </Link>
        <div className="links">
          {!showUpload && (
            <button
              className="nav-button"
              aria-label="add new plan"
              onClick={() => setShowUpload(true)}
            >
              Upload
            </button>
          )}
          {showUpload && resolver != null && planDefinition != null ? (
            <button
              className="nav-button"
              aria-label="add new plan"
              onClick={() => setShowUpload(false)}
            >
              Review
            </button>
          ) : (
            showUpload && (
              <button
                className="nav-button nav-button-disabled"
                aria-label="add new plan"
              >
                Review
              </button>
            )
          )}
          <Link
            href="https://github.com/reason-healthcare/reason-framework"
            target="_blank"
            className="nav-button"
            aria-label="documentation"
          >
            Github
          </Link>
        </div>
      </div>
      <div className="content-container">
        {!showUpload ? (
          contentDisplay
        ) : (
          <UploadSection {...uploadSectionProps} />
        )}
      </div>
    </div>
  )
}
