import {
  formatProperty,
  formatResourceType,
  formatTitle,
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

interface NarrativeDisplayProps {
  resolver: BrowserResolver | undefined
  setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
  nodeDetails?:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
  setShowNarrative: React.Dispatch<React.SetStateAction<boolean>>
}

const NarrativeDisplay = ({
  resolver,
  setSelected,
  nodeDetails,
  setShowNarrative,
}: NarrativeDisplayProps) => {
  const [resource, setResource] = useState<
    | fhir4.StructureDefinition
    | KnowledgeArtifact
    | TerminologyArtifact
    | fhir4.PlanDefinitionAction
    | undefined
  >()
  const [cql, setCql] = useState<string | undefined>()
  const [format, setFormat] = useState<'text' | 'json'>('text')

  const navigate = useNavigate()
  const path = useLocation().pathname
  useEffect(() => {
    if (nodeDetails != null) {
      if (is.KnowledgeArtifact(nodeDetails)) {
        delete nodeDetails.text
      }
      setResource(nodeDetails)
      setCql(undefined)
    } else if (resolver != null) {
      const reference = path.split('/').slice(-2).join('/')
      const rawResource = resolver.resolveReference(reference)
      if (
        is.PlanDefinition(rawResource) ||
        is.ActivityDefinition(rawResource)
      ) {
        setSelected(`definition-${rawResource.id}`)
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
    setShowNarrative(false)
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