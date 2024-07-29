import {
  formatProperty,
  formatResourceType,
  formatTitle,
  is,
  notEmpty,
} from '../helpers'
import { useLocation, useNavigate } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import BackButton from './BackButton'
import CQLDisplay from './CQLDisplay'
import '@/styles/detailsSection.css'
import { useEffect, useState } from 'react'

interface ResourceDetailsProps {
  resolver: BrowserResolver | undefined
  nodeDetails?:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
}

const ResourceDetails = ({ resolver, nodeDetails }: ResourceDetailsProps) => {
  const [resource, setResource] = useState<
    fhir4.FhirResource | fhir4.PlanDefinitionAction | undefined
  >()
  const [cql, setCql] = useState<string | undefined>()

  const navigate = useNavigate()
  const path = useLocation()
  useEffect(() => {
    if (nodeDetails != null) {
      setResource(nodeDetails)
      setCql(undefined)
    } else if (resolver != null) {
      path.pathname.split('/')
      const reference = path.pathname.split('/').slice(-2).join('/')
      const rawResource = resolver.resolveReference(reference)
      if (
        is.KnowledgeArtifact(rawResource) ||
        is.StructureDefinition(rawResource) ||
        is.TerminologyArtifact(rawResource)
      ) {
        setResource(rawResource)
      }
      if (is.Library(rawResource)) {
        setCql(resolver.resolveCql(reference))
      } else {
        setCql(undefined)
      }
    }
  }, [path])

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
        {formatedProperties}
        {cql != null && <CQLDisplay cql={cql} />}
        <BackButton />
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
