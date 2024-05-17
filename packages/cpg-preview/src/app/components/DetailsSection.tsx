import '@/styles/detailsSection.css'
import { is, notEmpty, resolveCanonical } from 'helpers'
import { v4 } from 'uuid'
import { CloseOutlined } from '@ant-design/icons'
import FileResolver from 'resolver/file'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DetailsSectionProps {
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>
  details:
    | fhir4.PlanDefinition
    | fhir4.PlanDefinitionAction
    | fhir4.ActivityDefinition
    | undefined
  resolver: FileResolver | undefined
}

const DetailsSection = ({
  details,
  setShowDetails,
  resolver,
}: DetailsSectionProps) => {
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

  const formatInputs = (inputs: fhir4.PlanDefinitionAction['input']) => {
    return inputs?.map((i: fhir4.DataRequirement) => {
      if (i.profile && resolver) {
        let resource = resolveCanonical(i.profile[0], resolver)
        if (is.structureDefinition(resource)) {
          return (
            <li key={v4()}>
              {resource.title ?? resource.name ?? resource.url}
            </li>
          )
        }
      }
    }).filter(notEmpty)
  }

  const formatDefinition = (canonical: string) => {
    let text
    if (resolver) {
      const resource = resolveCanonical(canonical, resolver)
      if (is.planDefinition(resource) || is.activityDefinition(resource)) {
        text = resource.title ?? resource.name
      }
    }
    if (!text) {
      text = canonical
    }
    return text
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

  interface SingleDisplayProps {
    header: string
    content: string
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

  const PlanDefinitionDisplay = ({
    definition
  }: PlanDefinitionDisplayProps) => {
    const {
      relatedArtifact,
      action,
    } = definition
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

  const ActionDisplay = ({
    sourceAction
  }: ActionDisplayProps) => {
    const {
      documentation,
      selectionBehavior,
      condition,
      input,
      action,
      definitionCanonical
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
        {input && <ListDisplay header="Input" content={formatInputs(input)} />}
        {definitionCanonical && <SingleDisplay header='Definition' content={formatDefinition(definitionCanonical)}/>}
      </div>
    )
  }

  interface ActivityDisplayProps {
    definition: fhir4.ActivityDefinition
  }

  const ActivityDefinitionDisplay = ({
    definition
  }: ActivityDisplayProps) => {
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
          <SingleDisplay header="Do Not Perform" content={doNotPerform.toString()} />
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
      </div>
    )
  }

  const handleClick = () => {
    setShowDetails(false)
  }


  const { title, description } = details

  const descriptionDisplay = (
    <div>
      <span className="details-description">Description</span>
      <span>
        :
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {description}
        </ReactMarkdown>
      </span>
    </div>
  )

  let header
  const DetailsDisplay = () => {
    if (is.planDefinition(details)) {
      const { name } = details
      header = `Plan Definition: ${title ?? name}`
      return(
        <div>
          <h2>{header}</h2>
          {descriptionDisplay}
          <PlanDefinitionDisplay definition={details} />
        </div>
      )
    } else if (is.activityDefinition(details)) {
      const { name } = details
      header = `Activity Definition: ${title ?? name}`
      return(
        <div>
          <h2>{header}</h2>
          {descriptionDisplay}
          <ActivityDefinitionDisplay definition={details} />
        </div>
      )
    } else {
      header = `Action: ${title}`
      return(
        <div>
          <h2>{header}</h2>
          {descriptionDisplay}
          <ActionDisplay sourceAction={details} />
        </div>
      )
    }
  }

  return (
    <div className="details-section">
      <div className="close">
        <CloseOutlined onClick={handleClick} />
      </div>
      <div className="details-container">
        <DetailsDisplay/>
      </div>
    </div>
  )
}

export default DetailsSection
