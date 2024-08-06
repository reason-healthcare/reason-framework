import {
  formatProperty,
  formatResourceType,
  formatTitle,
  formatUrl,
  is,
  KnowledgeArtifact,
  notEmpty,
  TerminologyArtifact,
} from '../../helpers'
import { useLocation, useNavigate } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import BackButton from '../BackButton'
import CodeBlock from './CodeBlock'
import '@/styles/NarrativeDisplay.css'
import { useEffect, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import type { RadioChangeEvent } from 'antd'
import { Radio } from 'antd'
import { NodeData } from '../../types/NodeData'
import SingleDisplayItem from './SingleDisplayItem'

interface NarrativeDisplayProps {
  resolver: BrowserResolver | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  nodeDetails?:
    | NodeData
    | undefined
}

const NarrativeDisplay = ({
  resolver,
  setSelectedNode,
  nodeDetails,

}: NarrativeDisplayProps) => {
  const [resource, setResource] = useState<
    | fhir4.StructureDefinition
    | KnowledgeArtifact
    | TerminologyArtifact
    | fhir4.PlanDefinitionAction
    | undefined
  >()
  const [cql, setCql] = useState<string | undefined>()
  const [partOfIdentifier, setPartOfIdentifier] = useState<string | undefined>()
  const [format, setFormat] = useState<'text' | 'json'>('text')

  const navigate = useNavigate()
  const path = useLocation().pathname
  useEffect(() => {
    setPartOfIdentifier(undefined)
    setCql(undefined)
    if (nodeDetails != null) {
      const {nodeDetails: details, partOf} = nodeDetails
      if (is.KnowledgeArtifact(details)) {
        delete details.text
      }
      if (partOf != null) {
        setPartOfIdentifier(partOf.url)
      }
      setResource(details)
    } else if (resolver != null) {
      const reference = path.split('/').slice(-2).join('/')
      const rawResource = resolver.resolveReference(reference)
      if (
        is.ActivityDefinition(rawResource)
      ) {
        setSelectedNode(rawResource.id)
      }
      if (
        is.KnowledgeArtifact(rawResource) ||
        is.StructureDefinition(rawResource) ||
        is.TerminologyArtifact(rawResource)
      ) {
        delete rawResource.text
        setResource(rawResource)
      }
      if (is.Library(rawResource)) {
        setCql(resolver.resolveCql(rawResource.id))
      } else {
        setCql(undefined)
      }
    }
  }, [path, nodeDetails])

  const handleClose = () => {
    setSelectedNode(undefined)
  }

  const onFormatChange = (e: RadioChangeEvent) => {
    setFormat(e.target.value)
  }

  let resourceDisplay
  if (resource != null) {
    const meta = [
      'id',
      'publisher',
      'title',
      'status',
      'date',
      'resourceType',
      'text',
      'meta',
      'url',
      'contact',
      'name',
      'version',
      'content',
      'mapping',
      'snapshot',
      'parameter',
    ]

    const formatedProperties = Object.entries(resource)
      .map((e: [string, any]) => {
        const [k, v] = e
        if (!meta.includes(k)) {
          return formatProperty(v, resolver, navigate, k)
        }
      })
      .filter(notEmpty)

    resourceDisplay = (
      <div className="narrative-container-outer">
        <div className="narrative-container-inner">
          <h2>{`${formatResourceType(resource) ?? 'Action'}: ${formatTitle(
            resource
          )}`}</h2>
          {partOfIdentifier != null && <SingleDisplayItem heading="Part Of" content={formatUrl(partOfIdentifier, resolver, navigate)}/>}
          {format === 'text' && cql != null ? (
            <>
              {formatedProperties}
              <CodeBlock cql={cql} />
            </>
          ) : format === 'json' ? (
            <CodeBlock cql={JSON.stringify(resource, null, 1)} />
          ) : (
            <>{formatedProperties}</>
          )}
          <Radio.Group
            onChange={onFormatChange}
            value={format}
            optionType="button"
            buttonStyle="solid"
            style={{ marginTop: '3rem' }}
          >
            <Radio value={'text'}>Text</Radio>
            <Radio value={'json'}>JSON</Radio>
          </Radio.Group>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="buttons-container">
        <BackButton />
        <CloseOutlined onClick={handleClose} />
      </div>
      {resourceDisplay != null ? resourceDisplay : <p>Unable to load json</p>}
    </>
  )
}

export default NarrativeDisplay
