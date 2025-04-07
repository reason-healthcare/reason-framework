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
import { PanelGroup, Panel } from 'react-resizable-panels'
import { UploadFile } from 'antd'
import { UserOutlined, CloseOutlined } from '@ant-design/icons'
import Nav, { NavProps } from './components/Nav'
import ApplyForm from './components/apply-form/ApplyForm'

export type SidePanelView = 'apply' | 'narrative' | undefined

export default function App() {
  const [resolver, setResolver] = useState<BrowserResolver | undefined>()
  const [planDefinition, setPlanDefinition] = useState<
    fhir4.PlanDefinition | undefined
  >()
  const [narrativeContent, setNarrativeContent] = useState<
    NodeContent | undefined
  >()
  const [sidePanelView, setSidePanelView] = useState<SidePanelView>()

  const [showUploadPage, setShowUploadPage] = useState<boolean>(true)
  const [selectedNode, setSelectedNode] = useState<string | undefined>()
  const [requestsBundle, setRequestsBundle] = useState<
    fhir4.Bundle | undefined
  >()

  const [contextReference, setContextReference] = useState<string | undefined>()

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
    setSidePanelView(undefined)
    if (resolver instanceof BrowserResolver && planDefinition != null) {
      setShowUploadPage(false)
    } else {
      setShowUploadPage(true)
    }
  }, [resolver, planDefinition])

  useEffect(() => {
    if (narrativeContent != null && selectedNode != null) {
      setSidePanelView('narrative')
    }
  }, [selectedNode])

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

  const handleApply = () => {
    setSidePanelView('apply')
  }

  const handleContextReset = () => {
    setRequestsBundle(undefined)
  }

  const contentDisplay = (
    <>
      <div className="plan-header">
        <div className="plan-title">
          {planDefinition != null && (
            <h1>
              {formatTitle(planDefinition)}
              {requestsBundle != null && (
                <span
                  style={{
                    color: '#666666',
                    fontWeight: 'normal',
                    fontSize: '18px',
                  }}
                >
                  {' - Applied Guidance'}
                </span>
              )}
            </h1>
          )}
        </div>
        {requestsBundle != null && contextReference != null ? (
          <div className="context">
            <div className="context-tag">
              <UserOutlined style={{ fontSize: '14px' }} />
              {contextReference}
              <button
                type="button"
                className="close-button"
                onClick={handleContextReset}
              >
                <CloseOutlined style={{ fontSize: '12px', marginTop: '1px' }} />
              </button>
            </div>
            <button
              type="button"
              className="button-simple"
              onClick={handleApply}
            >
              Edit
            </button>
          </div>
        ) : (
          <button type="button" className="button-simple" onClick={handleApply}>
            Add Context
          </button>
        )}
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
                setSidePanelView={setSidePanelView}
                requestsBundle={requestsBundle}
              />
            </ReactFlowProvider>
          ) : (
            <LoadIndicator />
          )}
        </Panel>
        {sidePanelView === 'apply' && planDefinition != null ? (
          <ApplyForm
            planDefinition={planDefinition}
            contentEndpoint={endpointPayload}
            setSidePanelView={setSidePanelView}
            setRequestsBundle={setRequestsBundle}
            setContextReference={setContextReference}
          />
        ) : (
          sidePanelView === 'narrative' && (
            <MemoryRouter>
              <NarrativeRouter
                narrativeContent={narrativeContent}
                resolver={resolver}
                setSelectedNode={setSelectedNode}
                setSidePanelView={setSidePanelView}
              />
            </MemoryRouter>
          )
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
