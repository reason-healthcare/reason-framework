import '@/styles/detailsSection.css'
import { is, resolveCanonical } from 'helpers'
import { v4 } from 'uuid'
import { CloseOutlined } from '@ant-design/icons'
import { Node } from 'reactflow'
import FileResolver from 'resolver/file'

interface DetailsSectionProps {
  setSelected: React.Dispatch<React.SetStateAction<Node | undefined>>
  selected: Node | undefined
  resolver: FileResolver | undefined
}

const DetailsSection = ({
  selected,
  setSelected,
  resolver,
}: DetailsSectionProps) => {
  const { details } = selected?.data

  if (!details) {
    return <p>Unable to load details</p>
  }
  const { title, description } = details
  let header: string
  let selection: fhir4.PlanDefinitionAction['selectionBehavior']
  let applicability: fhir4.PlanDefinitionAction['condition']
  let caseFeature: fhir4.PlanDefinitionAction['input']
  let children: fhir4.PlanDefinitionAction['action']
  let evidence

  if (is.planDefinition(details)) {
    const { name, relatedArtifact, action } = details
    header = `Plan Definition: ${title ?? name}`
    evidence = relatedArtifact
    children = action
  } else if (is.activityDefinition(details)) {
    const {
      name,
      kind,
      intent,
      doNotPerform,
      productCodeableConcept,
      productReference,
      quantity,
      dosage,
      dynamicValue,
    } = details
    header = `Activity Definition: ${title ?? name}`
  } else {
    const { documentation, selectionBehavior, condition, input, action } =
      details
    header = `Action: ${title}`
    evidence = documentation
    selection = selectionBehavior
    applicability = condition
    caseFeature = input
    children = action
  }

  const actionDisplay = children?.map((a) =>
    a.title ? <li key={v4()}>{a.title}</li> : null
  )

  const evidenceDisplay = evidence?.map((e: any) => {
    return (
      <li key={v4()}>
        {e?.type ? e.type.charAt(0).toUpperCase() + e.type.slice(1) : null}
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

  const applicabilities = applicability?.map((a) => {
    return <li key={v4()}>{a.expression?.expression ?? null}</li>
  })

  const caseFeatures = details?.input?.map((i: fhir4.DataRequirement) => {
    if (i.profile && resolver) {
      let resource = resolveCanonical(i.profile[0], resolver)
      if (is.structureDefinition(resource)) {
        return (
          <li key={v4()}>{resource.title ?? resource.name ?? resource.url}</li>
        )
      }
    }
  })

  const handleClick = () => {
    setSelected(undefined)
  }

  return (
    <div className="details-section">
      <div className="close">
        <CloseOutlined onClick={handleClick} />
      </div>
      <div className="details-container">
        <h2>{header}</h2>
        {description ? (
          <p>
            <span className="details-description">Description</span>
            <span>: {description}</span>
          </p>
        ) : undefined}{' '}
        {selection ? (
          <p>
            <span className="details-description">Selection Behavior</span>
            <span>: {selection}</span>
          </p>
        ) : undefined}{' '}
        {children ? (
          <p className="details-description">Child Actions:</p>
        ) : undefined}
        {actionDisplay}
        {evidence ? (
          <p className="details-description">Evidence:</p>
        ) : undefined}
        {evidenceDisplay}
        {applicability ? (
          <p className="details-description">Applicability:</p>
        ) : undefined}
        {applicabilities}
        {caseFeature ? (
          <p className="details-description">Input:</p>
        ) : undefined}
        {caseFeatures}
      </div>
    </div>
  )
}

export default DetailsSection
