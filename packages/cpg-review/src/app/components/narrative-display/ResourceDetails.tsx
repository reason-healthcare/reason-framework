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
import CodeDisplay from './CodeDisplay'
import '@/styles/NarrativeDisplay.css'
import { useEffect, useState } from 'react'

interface ResourceDetailsProps {
  resolver: BrowserResolver | undefined
  setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
  nodeDetails?:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
}

const ResourceDetails = ({
  resolver,
  setSelected,
  nodeDetails,
}: ResourceDetailsProps) => {
  const [resource, setResource] = useState<
    | fhir4.StructureDefinition
    | KnowledgeArtifact
    | TerminologyArtifact
    | fhir4.PlanDefinitionAction
    | undefined
  >()
  const [cql, setCql] = useState<string | undefined>()
  const [displayJson, setDisplayJson] = useState<boolean>(false)

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

    return (
      <div>
        <h2>{`${formatResourceType(resource) ?? 'Action'}: ${formatTitle(
          resource
        )}`}</h2>
        {!displayJson && cql != null ? (
          <>
            {formatedProperties}
            <CodeDisplay cql={cql} />
          </>
        ) : displayJson ? (
          <CodeDisplay cql={JSON.stringify(resource, null, 1)} />
        ) : (
          <>{formatedProperties}</>
        )}
        <div
          className={
            path === '/' ? 'buttons-container center' : 'buttons-container'
          }
        >
          <BackButton />
          <button
            className="format-button"
            onClick={() => setDisplayJson(!displayJson)}
          >
            {displayJson ? 'Text' : 'JSON'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <p>Unable to load details</p>
      <BackButton />
    </>
  )
}

export default ResourceDetails
