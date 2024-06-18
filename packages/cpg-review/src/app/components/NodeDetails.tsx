import '@/styles/detailsSection.css'
import {
  formatActions,
  formatApplicabilities,
  formatCodeableConcept,
  formatRelatedArtifact,
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

  interface PlanDefinitionDisplayProps {
    definition: fhir4.PlanDefinition
  }

  let definitionDisplay: JSX.Element | undefined
  if (definition && (definition.title || definition.name || definition.url)) {
    const display = formatTitle(definition)
    if (display) {
      definitionDisplay = (
        <SingleDisplayItem header={'Definition'} content={display} />
      )
    }
  }

  const PlanDefinitionDisplay = ({
    definition,
  }: PlanDefinitionDisplayProps) => {
    const { relatedArtifact, action, library } = definition
    let libraryDisplay: JSX.Element[] | JSX.Element | undefined
    if (resolver && library && library.length > 1) {
      libraryDisplay = library
        ?.map((l) => {
          resolveCanonical(l, resolver)
          if (is.Library(l)) {
            return (
              <li>
                <Link
                  onClick={() => navigate(`/Library/${l.id}`)}
                  to={`/Library/${l.id}`}
                >
                  {formatTitle(l)}
                </Link>
              </li>
            )
          }
        })
        .filter(notEmpty)
    } else if (resolver && library) {
      const rawResource = resolveCanonical(library[0], resolver)
      if (is.Library(rawResource)) {
        libraryDisplay = (
          <Link
            onClick={() => navigate(`/Library/${rawResource.id}`)}
            to={`/Library/${rawResource.id}`}
          >
            {formatTitle(rawResource)}
          </Link>
        )
      }
    }
    return (
      <div>
        {relatedArtifact && (
          <ListDisplayItem
            header="Documentation"
            content={formatRelatedArtifact(relatedArtifact)}
          />
        )}
        {Array.isArray(libraryDisplay) && (
          <ListDisplayItem header="Libraries" content={libraryDisplay} />
        )}
        {action && (
          <ListDisplayItem header="Actions" content={formatActions(action)} />
        )}
        {libraryDisplay && !Array.isArray(libraryDisplay) && (
          <SingleDisplayItem header="Library" content={libraryDisplay} />
        )}
      </div>
    )
  }

  interface ActionDisplayProps {
    sourceAction: fhir4.PlanDefinitionAction
  }

  const ActionDisplay = ({ sourceAction }: ActionDisplayProps) => {
    const {
      documentation,
      selectionBehavior,
      condition,
      input,
      action,
      definitionCanonical,
    } = sourceAction
    return (
      <div>
        {selectionBehavior && (
          <SingleDisplayItem
            header="SelectionBehavior"
            content={selectionBehavior}
          />
        )}
        {documentation && (
          <ListDisplayItem
            header="Documentation"
            content={formatRelatedArtifact(documentation)}
          />
        )}
        {action && (
          <ListDisplayItem
            header="Child Actions"
            content={formatActions(action)}
          />
        )}
        {condition && (
          <ListDisplayItem
            header="Applicability"
            content={formatApplicabilities(condition)}
          />
        )}
        {profiles.length > 0 ? (
          <ListDisplayItem header="Input" content={formatInputs(profiles)} />
        ) : null}
        {definitionDisplay}
      </div>
    )
  }

  interface ActivityDisplayProps {
    definition: fhir4.ActivityDefinition
  }

  const ActivityDefinitionDisplay = ({ definition }: ActivityDisplayProps) => {
    const {
      kind,
      intent,
      doNotPerform,
      productCodeableConcept,
      relatedArtifact,
      productReference,
      quantity,
      dosage,
      dynamicValue,
    } = definition
    return (
      <div>
        {kind && <SingleDisplayItem header="Kind" content={kind} />}
        {intent && <SingleDisplayItem header="Intent" content={intent} />}
        {doNotPerform && (
          <SingleDisplayItem
            header="Do Not Perform"
            content={doNotPerform.toString()}
          />
        )}
        {relatedArtifact && (
          <ListDisplayItem
            header="Documentation"
            content={formatRelatedArtifact(relatedArtifact)}
          />
        )}
        {productCodeableConcept && (
          <ListDisplayItem
            header="Product"
            content={formatCodeableConcept(productCodeableConcept, resolver)}
          />
        )}
        {/* {dosage?.length && dosage[0].text && (
          <SingleDisplayItem
            header="Dosage"
            content={formatDosageText(dosage[0].text)}
          />
        )} */}
      </div>
    )
  }

  const titleDisplay = formatTitle(details)
  const formatPrimitiveProperties = () => {
    return Object.entries(details)
      .map((e: [string, any]) => {
        const [k, v] = e
        return typeof v === 'string' ? (
          <SingleDisplayItem header={k} content={v} />
        ) : null
      })
      .filter(notEmpty)
  }

  return (
    <div>
      <h2>{`Plan Definition: ${titleDisplay}`}</h2>
      {formatPrimitiveProperties()}
    </div>
  )
  // if (is.PlanDefinition(details)) {
  //   return (
  //     <div>
  //       <h2>{`Plan Definition: ${titleDisplay}`}</h2>
  //       <SingleDisplayItem header='Description' content={formatDescription(description)} />
  //       <PlanDefinitionDisplay definition={details} />
  //     </div>
  //   )
  // } else if (is.ActivityDefinition(details)) {
  //   return (
  //     <div>
  //       <h2>{`Activity Definition: ${titleDisplay}`}</h2>
  //       <SingleDisplayItem header='Description' content={formatDescription(description)} />
  //       <ActivityDefinitionDisplay definition={details} />
  //     </div>
  //   )
  // } else {
  //   return (
  //     <div>
  //       <h2>{`Action: ${titleDisplay}`}</h2>
  //       <SingleDisplayItem header='Description' content={formatDescription(description)} />
  //       <ActionDisplay sourceAction={details} />
  //     </div>
  //   )
  // }
}
export default NodeDetails
