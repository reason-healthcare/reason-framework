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
    /** Narrative content is set on node select */
    if (narrativeContent != null) {
      const { resource, partOf } = narrativeContent
      if (partOf != null) {
        if (is.PlanDefinition(partOf)) {
          setPartOfIdentifier(partOf.url)
        } else {
          setPartOfIdentifier(`${partOf.resourceType}/${partOf.id}`)
        }
      }
      setResource(resource)
      /** Where node content is not passed to Narrative Display, resolve resource by reference */
    } else if (resolver != null && path != null) {
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

    return (
      <div className="narrative-container-outer">
        <BackButton />
        <div
          className="narrative-container-inner"
          style={{ marginTop: '1rem' }}
        >
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

  return <p>{`Unable to load ${path}`}</p>
}

export default NarrativeDisplay
