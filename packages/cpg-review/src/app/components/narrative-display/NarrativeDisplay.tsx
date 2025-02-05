import {
  formatProperty,
  formatResourceType,
  formatTitle,
  formatUrl,
  getNodeIdFromResource,
  is,
  notEmpty,
} from '../../helpers'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import type { RadioChangeEvent } from 'antd'
import { Radio } from 'antd'
import BrowserResolver from 'resolver/browser'
import CodeBlock from './CodeBlock'
import BackButton from '../BackButton'
import SingleDisplayItem from './SingleDisplayItem'
import { NodeContent } from '@/types/NodeProps'
import '@/styles/narrativeDisplay.css'

const META = [
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
  'jurisdiction',
  'count',
]

interface NarrativeDisplayProps {
  resolver: BrowserResolver | undefined
  setSelectedNode: React.Dispatch<React.SetStateAction<string | undefined>>
  narrativeContent?: NodeContent | undefined
}

const NarrativeDisplay = ({
  resolver,
  setSelectedNode,
  narrativeContent,
}: NarrativeDisplayProps) => {
  const [resource, setResource] = useState<
    fhir4.FhirResource | fhir4.PlanDefinitionAction | undefined
  >()
  const [cql, setCql] = useState<string | undefined>()
  const [partOfIdentifier, setPartOfIdentifier] = useState<string | undefined>()
  const [contentFormat, setContentFormat] = useState<'text' | 'json'>('text')

  const navigate = useNavigate()
  const path = useLocation().pathname
  useEffect(() => {
    setResource(undefined)
    setPartOfIdentifier(undefined)
    setCql(undefined)
    /** Narrative content is set from node select. Preferred to resolving a canonical or reference to the content considering Action nodes do not represent Canonical resources */
    if (narrativeContent != null) {
      const { resource, partOf } = narrativeContent
      if (partOf != null) {
        setPartOfIdentifier(partOf.url)
      }
      setResource(resource)
    } else if (resolver != null) {
      const reference = path.split('/').slice(-2).join('/')
      const rawResource = resolver.resolveReference(reference)
      if (is.ActivityDefinition(rawResource) || is.Questionnaire(rawResource)) {
        setSelectedNode(getNodeIdFromResource(rawResource))
      }
      if (is.Library(rawResource)) {
        const cql = rawResource.content?.find(
          (c) => c.contentType === 'text/cql'
        )?.data
        if (cql != null) {
          setCql(atob(cql))
        }
      } else {
        setCql(undefined)
      }
      if (rawResource != null) {
        setResource(rawResource)
      }
    }
  }, [path, narrativeContent])

  const handleNarrativeClose = () => {
    setSelectedNode(undefined)
  }

  const onContentFormatChange = (e: RadioChangeEvent) => {
    setContentFormat(e.target.value)
  }

  let resourceDisplay
  if (resource != null) {
    const formattedContent =
      contentFormat === 'text' ? (
        Object.entries(resource)
          .map((e: [string, any]) => {
            const [key, value] = e
            if (key === 'meta' && value.profile != null) {
              return formatProperty(
                value.profile,
                resolver,
                navigate,
                'meta.profile'
              )
            } else if (!META.includes(key)) {
              return formatProperty(value, resolver, navigate, key)
            }
          })
          .filter(notEmpty)
      ) : (
        <CodeBlock code={JSON.stringify(resource, null, 1)} />
      )

    resourceDisplay = (
      <div className="narrative-container-outer">
        <div className="narrative-container-inner">
          <h2>{`${formatResourceType(resource)}: ${formatTitle(resource)}`}</h2>
          {partOfIdentifier != null && (
            <SingleDisplayItem
              heading="Part Of"
              content={formatUrl(partOfIdentifier, resolver, navigate)}
            />
          )}
          {formattedContent}
          {cql != null && contentFormat === 'text' && <CodeBlock code={cql} />}
          <Radio.Group
            onChange={onContentFormatChange}
            value={contentFormat}
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
        <CloseOutlined onClick={handleNarrativeClose} />
      </div>
      {resourceDisplay != null ? (
        resourceDisplay
      ) : (
        <p>{`Unable to load ${path}`}</p>
      )}
    </>
  )
}

export default NarrativeDisplay
