import '@/styles/detailsSection.css'
import {
  formatCodeableConcept,
  formatRelatedArtifact,
  is,
  notEmpty,
  resolveCanonical,
  resolveReference,
} from '../helpers'
import { v4 } from 'uuid'
import { CloseOutlined } from '@ant-design/icons'
import FileResolver from 'resolver/file'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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

  const formatActions = (actions: fhir4.PlanDefinitionAction[]) => {
    let index = 0
    return actions
      .map((a) => {
        const header = a.title ?? a.id
        index += 1
        return (
          <li key={v4()}>
            {header ?? `Action ${index} (no identifier available)`}
          </li>
        )
      })
      .filter(notEmpty)
  }

  const formatApplicabilities = (
    condition: fhir4.PlanDefinitionAction['condition']
  ) => {
    return condition?.map((c) => {
      return <li key={v4()}>{c.expression?.expression ?? null}</li>
    })
  }

  useEffect(() => {
    if (!is.planDefinition(details) && !is.activityDefinition(details)) {
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
          is.planDefinition(definition) ||
          is.activityDefinition(definition)
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
        if (is.structureDefinition(i)) {
          return (
            <li key={i.id}>
              <Link
                onClick={() => navigate(`/${i.resourceType}/${i.id}`)}
                to={`/${i.resourceType}/${i.id}`}
              >
                {i.title ?? i.name ?? i.url ?? i.id}
              </Link>
            </li>
          )
        }
      })
      .filter(notEmpty)
  }
  const formatProdcuts = (
    products: fhir4.ActivityDefinition['productCodeableConcept']
  ) => {
    return products?.coding?.map((c: fhir4.Coding) => {
      return (
        <li key={v4()}>
          {c.display}
          {c.code ? (
            <p>
              Coding: {c.code} {c.system}
            </p>
          ) : undefined}
        </li>
      )
    })
  }

  const formatDosageText = (text: fhir4.Dosage['text']) => {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  }

  interface PlanDefinitionDisplayProps {
    definition: fhir4.PlanDefinition
  }

  let definitionDisplay: JSX.Element | undefined
  if (definition && (definition.title || definition.name || definition.url)) {
    const { title, name, url, id } = definition
    const display = title ?? name ?? url ?? id
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
                  {l.title ?? l.name ?? l.url ?? l.id}
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
            {rawResource.title ??
              rawResource.name ??
              rawResource.url ??
              rawResource.id}
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
  const { title, description, id } = details

  let descriptionDisplay
  if (description) {
    descriptionDisplay = (
      <div>
        <span className="details-description">Description:</span>
        <span>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {description}
          </ReactMarkdown>
        </span>
      </div>
    )
  }

  // const DetailsDisplay = () => {
  //   let header
  //   if (is.planDefinition(details)) {
  //     const { name } = details
  //     header = `Plan Definition: ${title ?? name}`
  //     return (
  //       <div>
  //         <h2>{header}</h2>
  //         {descriptionDisplay}
  //         <PlanDefinitionDisplay definition={details} />
  //       </div>
  //     )
  //   } else if (is.activityDefinition(details)) {
  //     const { name } = details
  //     header = `Activity Definition: ${title ?? name}`
  //     return (
  //       <div>
  //         <h2>{header}</h2>
  //         {descriptionDisplay}
  //         <ActivityDefinitionDisplay definition={details} />
  //       </div>
  //     )
  //   } else {
  //     header = `Action: ${title}`
  //     return (
  //       <div>
  //         <h2>{header}</h2>
  //         {descriptionDisplay}
  //         <ActionDisplay sourceAction={details} />
  //       </div>
  //     )
  //   }
  // }

  let header
  if (is.planDefinition(details)) {
    const { name, url } = details
    header = `Plan Definition: ${title ?? name ?? url ?? id ?? ''}`
    return (
      <div>
        <h2>{header}</h2>
        {descriptionDisplay}
        <PlanDefinitionDisplay definition={details} />
      </div>
    )
  } else if (is.activityDefinition(details)) {
    const { name, url } = details
    header = `Activity Definition: ${title ?? name ?? url ?? id ?? ''}`
    return (
      <div>
        <h2>{header}</h2>
        {descriptionDisplay}
        <ActivityDefinitionDisplay definition={details} />
      </div>
    )
  } else {
    header = `Action: ${title ?? id ?? ''}`
    return (
      <div>
        <h2>{header}</h2>
        {descriptionDisplay}
        <ActionDisplay sourceAction={details} />
      </div>
    )
  }
}
export default NodeDetails