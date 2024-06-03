import '@/styles/detailsSection.css'
import { is, notEmpty, resolveCanonical } from '../helpers'
import { v4 } from 'uuid'
import { CloseOutlined } from '@ant-design/icons'
import FileResolver from 'resolver/file'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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

const NodeDetails = ({details, resolver}: NodeDetailsProps) => {
  const [profiles, setProfiles] = useState<fhir4.Resource[]>([])
  const [definition, setDefinition] = useState<
    fhir4.PlanDefinition | fhir4.ActivityDefinition
  >()
  if (!details) {
    return <p>Unable to load details</p>
  }

  const formatActions = (actions: fhir4.PlanDefinitionAction[]) => {
    return actions
      .map((a) => (a.title ? <li key={v4()}>{a.title}</li> : null))
      .filter(notEmpty)
  }

  const formatDocumentation = (evidence: fhir4.RelatedArtifact[]) => {
    return evidence.map((e: any) => {
      return (
        <li key={v4()}>
          {e?.type
            ? e.type.charAt(0).toUpperCase() + e.type.slice(1) + ':'
            : null}
          {e.display || e.label ? <p>{e.display ?? e.label}</p> : null}
          {e.citation ? <p>{e.citation}</p> : null}
          {e.url ? (
            <p>
              <a href={e.url} target="blank">
                {e.url}
              </a>
            </p>
          ) : null}
          {e.document?.title ? (
            <p>
              <a href="">{e.document.title}</a>
            </p>
          ) : null}{' '}
        </li>
      )
    })
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
        if (is.planDefinition(definition) || is.activityDefinition(definition)) {
          setDefinition(definition)
        }
        // resolver?.resolveCanonical(definitionCanonical).then(definition => {
        //   if (is.planDefinition(definition) || is.activityDefinition(definition)) {
        //     setDefinition(definition)
        //   }
        // })
      } else {
        setDefinition(undefined)
      }
    }
  }, [details])

  let navigate = useNavigate()

  const formatInputs = (inputs: fhir4.Resource[]) => {
    return inputs.map((i: fhir4.Resource) => {
      if (is.structureDefinition(i)) {
        return (
          <li key={i.id}>
            <Link onClick={() => navigate(`/${i.id}`)} to={`/${i.id}`}>{i.title ?? i.name ?? i.url ?? i.id}</Link>
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

  interface SingleDisplayProps {
    header: string
    content: string | JSX.Element
  }

  const SingleDisplay = ({ header, content }: SingleDisplayProps) => {
    return (
      <div className="single-item">
        <span className="details-description">{header}</span>
        <span>: {content}</span>
      </div>
    )
  }

  interface ListDisplayProps {
    header: string
    content: JSX.Element[] | undefined
  }

  const ListDisplay = ({ header, content }: ListDisplayProps) => {
    return (
      <div>
        <p className="details-description">{header}:</p>
        <ul>{content}</ul>
      </div>
    )
  }

  interface PlanDefinitionDisplayProps {
    definition: fhir4.PlanDefinition
  }

  let definitionDisplay: JSX.Element | undefined
  if (definition && (definition.title || definition.name || definition.url)) {
    const {title, name, url} = definition
    const display = title ?? name ?? url
    if (display) {
      definitionDisplay = (
        <SingleDisplay
          header={'Definition'}
          content={display}
        />
      )
    }
  }

  const PlanDefinitionDisplay = ({
    definition,
  }: PlanDefinitionDisplayProps) => {
    const { relatedArtifact, action } = definition
    return (
      <div>
        {relatedArtifact && (
          <ListDisplay
            header="Documentation"
            content={formatDocumentation(relatedArtifact)}
          />
        )}
        {action && (
          <ListDisplay header="Actions" content={formatActions(action)} />
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
          <SingleDisplay
            header="SelectionBehavior"
            content={selectionBehavior}
          />
        )}
        {documentation && (
          <ListDisplay
            header="Documentation"
            content={formatDocumentation(documentation)}
          />
        )}
        {action && (
          <ListDisplay header="Child Actions" content={formatActions(action)} />
        )}
        {condition && (
          <ListDisplay
            header="Applicability"
            content={formatApplicabilities(condition)}
          />
        )}
        {profiles.length > 0 ? (
          <ListDisplay header="Input" content={formatInputs(profiles)} />
        ): null}
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
        {kind && <SingleDisplay header="Kind" content={kind} />}
        {intent && <SingleDisplay header="Intent" content={intent} />}
        {doNotPerform && (
          <SingleDisplay
            header="Do Not Perform"
            content={doNotPerform.toString()}
          />
        )}
        {relatedArtifact && (
          <ListDisplay
            header="Documentation"
            content={formatDocumentation(relatedArtifact)}
          />
        )}
        {productCodeableConcept && (
          <ListDisplay
            header="Product"
            content={formatProdcuts(productCodeableConcept)}
          />
        )}
        {/* {dosage?.length && dosage[0].text && (
          <SingleDisplay
            header="Dosage"
            content={formatDosageText(dosage[0].text)}
          />
        )} */}
      </div>
    )
  }
  const { title, description } = details

  const descriptionDisplay = (
    <div>
      <span className="details-description">Description:</span>
      <span>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
      </span>
    </div>
  )

  const DetailsDisplay = () => {
    let header
    if (is.planDefinition(details)) {
      const { name } = details
      header = `Plan Definition: ${title ?? name}`
      return (
        <div>
          <h2>{header}</h2>
          {descriptionDisplay}
          <PlanDefinitionDisplay definition={details} />
        </div>
      )
    } else if (is.activityDefinition(details)) {
      const { name } = details
      header = `Activity Definition: ${title ?? name}`
      return (
        <div>
          <h2>{header}</h2>
          {descriptionDisplay}
          <ActivityDefinitionDisplay definition={details} />
        </div>
      )
    } else {
      header = `Action: ${title}`
      return (
        <div>
          <h2>{header}</h2>
          {descriptionDisplay}
          <ActionDisplay sourceAction={details} />
        </div>
      )
    }
  }


  let header
  if (is.planDefinition(details)) {
    const { name } = details
    header = `Plan Definition: ${title ?? name}`
    return (
      <div>
        <h2>{header}</h2>
        {descriptionDisplay}
        <PlanDefinitionDisplay definition={details} />
      </div>
    )
  } else if (is.activityDefinition(details)) {
    const { name } = details
    header = `Activity Definition: ${title ?? name}`
    return (
      <div>
        <h2>{header}</h2>
        {descriptionDisplay}
        <ActivityDefinitionDisplay definition={details} />
      </div>
    )
  } else {
    header = `Action: ${title}`
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
