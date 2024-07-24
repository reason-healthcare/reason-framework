import '@/styles/detailsSection.css'
import {
  formatProperty,
  formatResourceType,
  formatTitle,
  is,
  notEmpty,
  resolveCanonical,
} from '../helpers'
import FileResolver from 'resolver/file'
import BrowserResolver from 'resolver/browser'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface NodeDetailsProps {
  details:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
  resolver: FileResolver | BrowserResolver | undefined
}

const NodeDetails = ({ details, resolver }: NodeDetailsProps) => {
  const [profiles, setProfiles] = useState<fhir4.Resource[]>([])
  const [definition, setDefinition] = useState<
    fhir4.PlanDefinition | fhir4.ActivityDefinition
  >()
  if (!details) {
    return <p>Unable to load details</p>
  }

  useEffect(() => {
    if (!is.PlanDefinition(details) && !is.ActivityDefinition(details)) {
      const { input, definitionCanonical } = details
      if (input?.length) {
        Promise.all(
          input.map((i) => {
            if (i.profile && resolver) {
              return resolveCanonical(i.profile[0], resolver)
              // return resolver?.resolveCanonical(i.profile[0])
            }
          })
        ).then((resolvedInputs) => {
          setProfiles(resolvedInputs.filter(notEmpty))
        })
      } else {
        setProfiles([])
      }

      if (definitionCanonical && resolver) {
        const definition = resolveCanonical(definitionCanonical, resolver)
        if (
          is.PlanDefinition(definition) ||
          is.ActivityDefinition(definition)
        ) {
          setDefinition(definition)
        }
      } else {
        setDefinition(undefined)
      }
    }
  }, [details])

  let navigate = useNavigate()
  const formatInputs = (inputs: fhir4.Resource[]) => {
    return inputs
      .map((i: fhir4.Resource) => {
        if (is.StructureDefinition(i)) {
          return (
            <li key={i.id}>
              <Link
                onClick={() => navigate(`/${i.resourceType}/${i.id}`)}
                to={`/${i.resourceType}/${i.id}`}
              >
                {formatTitle(i)}
              </Link>
            </li>
          )
        }
      })
      .filter(notEmpty)
  }

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
    'version'
  ]

  const formatedProperties = (
    Object.entries(details)
      .map((e: [string, any]) => {
        const [k, v] = e
        if (!meta.includes(k)) {
          return formatProperty(v, k)
        }
      })
      .filter(notEmpty)
    )

  return (
    <div>
      <h2>{`${formatResourceType(details) ?? 'Action'}: ${formatTitle(details)}`}</h2>
      {formatedProperties}
    </div>
  )
}
export default NodeDetails
