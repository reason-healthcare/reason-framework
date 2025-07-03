'use client'
import { useState, useEffect } from 'react'
import BrowserResolver from './resolver/browser'
import {
  PlanDefinitionSelectionOption,
  UploadSectionProps,
} from './components/UploadSection'
import { NodeContent } from './types/NodeProps'
import { UploadFile } from 'antd'
import Header from './components/Header'
import ContentSection from './components/ContentSection'
import dynamic from 'next/dynamic'
import LoadIndicator from './components/LoadIndicator'

const UploadSection = dynamic(() => import('@/components/UploadSection'), {
  ssr: false,
  loading: () => <LoadIndicator />,
})

export type SidePanelView = 'apply' | 'narrative' | undefined

export default function App() {
  const [resolver, setResolver] = useState<BrowserResolver | undefined>()
  const [planDefinition, setPlanDefinition] = useState<
    fhir4.PlanDefinition | undefined
  >()
  const [narrativeContent, setNarrativeContent] = useState<
    NodeContent | undefined
  >()
  const [sidePanelView, setSidePanelView] = useState<SidePanelView>(undefined)
  const [showUploadPage, setShowUploadPage] = useState<boolean>(true)
  const [selectedNode, setSelectedNode] = useState<string | undefined>()

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

  const contentSectionProps = {
    resolver,
    planDefinition,
    narrativeContent,
    setNarrativeContent,
    setSelectedNode,
    setSidePanelView,
    sidePanelView,
    endpointPayload,
    selectedNode,
  }

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

  return (
    <div className="app-container">
      <div className="header-container">
        <Header
          resolver={resolver}
          planDefinition={planDefinition}
          showUploadPage={showUploadPage}
          setShowUploadPage={setShowUploadPage}
        />
      </div>
      <div className="content-container">
        {!showUploadPage ? (
          <ContentSection {...contentSectionProps} />
        ) : (
          <UploadSection {...uploadSectionProps} />
        )}
      </div>
    </div>
  )
}
