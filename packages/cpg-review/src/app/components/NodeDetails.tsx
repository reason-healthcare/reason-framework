import '@/styles/detailsSection.css'
import {
  formatProperty,
  formatTitle,
  is,
  notEmpty,
  resolveCanonical,
} from '../helpers'
import { v4 } from 'uuid'
import FileResolver from 'resolver/file'
import BrowserResolver from 'resolver/browser'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SingleDisplayItem from './SingleDisplayItem'
import ListDisplayItem from './ListDisplayItem'

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

  const titleDisplay = formatTitle(details)
  const formatedProperties = (
    Object.entries(details)
      .map((e: [string, any]) => {
        const [k, v] = e
        return formatProperty(v, k)
      })
      .filter(notEmpty)
    )
  let resourceTypeFormatted
  if (is.KnowledgeArtifact(details) || is.StructureDefinition(details)) {
    resourceTypeFormatted = details.resourceType.split(/(?=[A-Z])/).join(' ')
  }

  return (
    <div>
      <h2>{`${resourceTypeFormatted ?? 'Action'}: ${titleDisplay}`}</h2>
      {formatedProperties}
    </div>
  )
}
export default NodeDetails
