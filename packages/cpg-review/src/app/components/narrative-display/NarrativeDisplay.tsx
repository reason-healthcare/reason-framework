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
  nodeData?: NodeData | undefined
}

const NarrativeDisplay = ({
  resolver,
  setSelectedNode,
  nodeData,
}: NarrativeDisplayProps) => {
  const [resource, setResource] = useState<
    fhir4.FhirResource | fhir4.PlanDefinitionAction | undefined
  >()
  const [cql, setCql] = useState<string | undefined>()
  const [partOfIdentifier, setPartOfIdentifier] = useState<string | undefined>()
  const [format, setFormat] = useState<'text' | 'json'>('text')

  const navigate = useNavigate()
  const path = useLocation().pathname
  useEffect(() => {
    console.log('From display panel:')
    console.log(path)
    setResource(undefined)
    setPartOfIdentifier(undefined)
    setCql(undefined)
    if (nodeData != null) {
      console.log('using node details')
      const { nodeDetails: details, partOf } = nodeData
      if (partOf != null) {
        setPartOfIdentifier(partOf.url)
      }
      setResource(details)
    } else if (resolver != null) {
      console.log('resolving')
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
  }, [path, nodeData])

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
      'jurisdiction',
      'count',
    ]

    const formattedProperties = Object.entries(resource)
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
          {partOfIdentifier != null && (
            <SingleDisplayItem
              heading="Part Of"
              content={formatUrl(partOfIdentifier, resolver, navigate)}
            />
          )}
          {format === 'text' && cql != null ? (
            <>
              {formattedProperties}
              <CodeBlock cql={cql} />
            </>
          ) : format === 'json' ? (
            <CodeBlock cql={JSON.stringify(resource, null, 1)} />
          ) : (
            <>{formattedProperties}</>
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
      {resourceDisplay != null ? (
        resourceDisplay
      ) : (
        <p>{`Unable to load ${path}`}</p>
      )}
    </>
  )
}

export default NarrativeDisplay
