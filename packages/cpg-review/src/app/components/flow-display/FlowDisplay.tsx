'use client'
import { useState, useEffect, useMemo } from 'react'
import ReactFlow, {
  Edge,
  Node,
  Background,
  Controls,
  MiniMap,
  ControlButton,
  useReactFlow,
  NodeTypes,
} from 'reactflow'
import Flow from '../../graph/Flow'
import ContentNode from './ContentNode'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import BrowserResolver from 'resolver/browser'
import StartNode from './StartNode'
import { NodeContent } from '../../types/NodeProps'
import ApplicabilityNode from './ApplicabilityNode'
import { Button } from 'antd'

const requestBundle: fhir4.Bundle = {
  "resourceType": "Bundle",
  "id": "4ApplyOutput1",
  "type": "collection",
  "entry": [
    {
      "fullUrl": "http://example.org/RequestGroup/RequestGroup1",
      "resource": {
        "resourceType": "RequestGroup",
        "id": "RequestGroup1",
        "intent": "proposal",
        "status": "draft",
        "subject": {
          "reference": "Patient/Patient1"
        },
        "instantiatesCanonical": [
          "http://example.org/PlanDefinition/SulfasalazineMonitoringRecommendation|0.1.0"
        ],
        "action": [
          {
            "title": "Order monitoring tests for antirheumatic drug therapy (Sulfasalazine).",
            "description": "Order monitoring tests for antirheumatic drug therapy (Sulfasalazine).",
            "code": [
              {
                "coding": [
                  {
                    "code": "diagnostic-testing",
                    "system": "http://hl7.org/fhir/uv/cpg/CodeSystem/cpg-common-process"
                  }
                ]
              }
            ],
            "type": {
              "coding": [
                {
                  "code": "create",
                  "system": "http://terminology.hl7.org/CodeSystem/action-type"
                }
              ]
            },
            "condition": [
              {
                "kind": "applicability",
                "expression": {
                  "language": "text/cql-identifier",
                  "expression": "Should order CBC if on Sulfasalazine therapy and missing test"
                }
              }
            ],
            "resource": {
              "reference": "ServiceRequest/ServiceRequest1"
            }
          }
        ]
      }
    },
    {
      "fullUrl": "http://example.org/ServiceRequest/ServiceRequest1",
      "resource": {
        "resourceType": "ServiceRequest",
        "id": "ServiceRequest1",
        "status": "draft",
        "intent": "option",
        "instantiatesCanonical": [
          "http://example.org/ActivityDefinition/OrderCBCActivity|0.1.0"
        ],
        "subject": {
          "reference": "Patient/Patient1"
        },
        "doNotPerform": false,
        "code": {
          "coding": [
            {
              "code": "58410-2",
              "system": "http://loinc.org",
              "display": "CBC panel - Blood by Automated count"
            }
          ]
        }
      }
    }
  ]
}


interface FlowDisplayProps {
  resolver: BrowserResolver
  planDefinition: fhir4.PlanDefinition
  setNarrativeContent: React.Dispatch<
    React.SetStateAction<NodeContent | undefined>
  >
  selectedNode: string | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
}

export default function FlowDisplay({
  resolver,
  planDefinition,
  setNarrativeContent,
  selectedNode,
  setSelectedNode,
}: FlowDisplayProps) {
  const [initialFlow, setInitialFlow] = useState<Flow | undefined>()
  const [visibleNodes, setVisibleNodes] = useState<Node[] | undefined>()
  const [visibleEdges, setVisibleEdges] = useState<Edge[] | undefined>()
  const [expandedView, setExpandedView] = useState<boolean>(true)
  const [nodeToExpand, setNodeToExpand] = useState<string>()

  const nodeTypes = useMemo(
    () => ({
      contentNode: ContentNode,
      startNode: StartNode,
      applicabilityNode: ApplicabilityNode,
    }),
    []
  ) as NodeTypes

  useEffect(() => {
    const flow = new Flow(planDefinition, resolver)
    if (resolver && resolver.resourcesByCanonical) {
      flow.generateInitialFlow()
      flow
        .positionNodes({
          setNodeToExpand,
          setSelectedNode,
        })
        .then((updatedFlow) => {
          setInitialFlow(updatedFlow)
          setVisibleNodes(updatedFlow.nodes)
          setVisibleEdges(updatedFlow.edges)
        })
    }
  }, [])

  useEffect(() => {
    if (visibleNodes != null && selectedNode != null) {
      const node = visibleNodes.find((n) => n.id === selectedNode)
      setVisibleNodes(Flow.setSelectedNode(visibleNodes, node?.id ?? undefined))
      if (node != null) {
        setNarrativeContent(node.data.nodeContent)
      } else {
        console.log(`Unable to find selected node ${selectedNode}`)
      }
    }
  }, [selectedNode])

  useEffect(() => {
    if (initialFlow?.nodes != null && initialFlow?.edges != null) {
      if (!expandedView) {
        const newFlow = new Flow(planDefinition, resolver, initialFlow.nodes, initialFlow.edges)
        newFlow.collapseAllChildren().then(() => {
          setVisibleNodes(newFlow.nodes)
          setVisibleEdges(newFlow.edges)
        })
      } else {
        setVisibleNodes(initialFlow.nodes)
        setVisibleEdges(initialFlow.edges)
      }
    }
  }, [expandedView])

  const reactFlow = useReactFlow()
  useEffect(() => {
    if (
      nodeToExpand != null &&
      initialFlow?.nodes != null &&
      initialFlow?.edges != null
    ) {
      const sourceNode = initialFlow.nodes.find((n) => n.id === nodeToExpand)
      if (sourceNode != null) {
        const newFlow = new Flow(planDefinition, resolver, visibleNodes, visibleEdges)
        newFlow
          .expandChild(sourceNode, initialFlow.nodes, initialFlow.edges)
          .then((updatedFlow) => {
            setVisibleNodes(updatedFlow.nodes)
            setVisibleEdges(updatedFlow.edges)
            newFlow.centerOnNode(nodeToExpand, 60, 1, reactFlow)
            setSelectedNode(sourceNode.id)
          })
      } else {
        console.log(
          `Unable to find source node ${nodeToExpand} for graph expansion.`
        )
      }
    }
  }, [nodeToExpand])

  const handleExpandedViewClick = () => {
    setExpandedView(!expandedView)
    setSelectedNode(undefined)
    setNodeToExpand(undefined)
  }

  const nodeColor = (node: Node) => {
    switch (node.type) {
      case 'contentNode':
        return 'var(--teal)'
      case 'Node':
        return 'var(--ltTeal)'
      default:
        return 'var(--blueGray)'
    }
  }

  const selectRG = () => {
    if (initialFlow != null) {
      resolver.addResourcesFromBundle(requestBundle)
      const newFlow = initialFlow.generateRequestGroup(requestBundle, planDefinition)
      if (newFlow != null) {
        newFlow
          .positionNodes({
            setNodeToExpand,
            setSelectedNode,
          })
          .then((updatedFlow) => {
            setVisibleNodes(updatedFlow.nodes)
            setVisibleEdges(updatedFlow.edges)
          })
      } else {
        console.log('Unable to generate Request Group')
      }
    }
  }

  return (
    <div className="flow-container">
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        fitView={true}
        elevateEdgesOnSelect={true}
      >
        <Background color="#fafafa" />
        <MiniMap
          pannable
          zoomable
          position="bottom-left"
          nodeColor={nodeColor}
        />
        <Controls showInteractive={false} position="bottom-right">
          <ControlButton onClick={handleExpandedViewClick}>
            {expandedView ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </ControlButton>
        </Controls>
      </ReactFlow>
      <Button onClick={selectRG}>Request Group</Button>
    </div>
  )
}
