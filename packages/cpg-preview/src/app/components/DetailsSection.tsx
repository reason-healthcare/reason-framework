import '@/styles/detailsSection.css'
import { is } from 'helpers'
import { v4 } from 'uuid'
import { CloseOutlined } from '@ant-design/icons'
import { Node } from 'reactflow'

interface DetailsSectionProps {
  details: fhir4.PlanDefinition | fhir4.PlanDefinitionAction | undefined
  setSelected: React.Dispatch<React.SetStateAction<Node | undefined>>
}

const DetailsSection = ({ details, setSelected }: DetailsSectionProps) => {
  if (!details) {
    return <p>Unable to load details</p>
  }
  const { title, description, action } = details
  let header
  let evidence
  let selection
  let applicability
  let caseFeature
  if (is.planDefinition(details)) {
    const { name, relatedArtifact } = details
    header = `Plan Definition: ${title ?? name}`
    evidence = relatedArtifact
  } else {
    const { documentation, selectionBehavior, condition, input } = details
    header = `Action: ${title}`
    evidence = documentation
    selection = selectionBehavior
    applicability = condition
    caseFeature = input
  }

  const actionDisplay = action?.map((a) =>
    a.title ? <li>{a.title}</li> : null
  )

  const evidenceDisplay = evidence?.map((e) => {
    return (
      <li key={v4()}>
        {e.type ? e.type.charAt(0).toUpperCase() + e.type.slice(1) : null}
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
    return <li>{a.expression?.expression ?? null}</li>
  })

  const caseFeatures = caseFeature?.map((c) => {
    return <li>{c.profile ?? null}</li>
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
        {action ? (
          <p className="details-description">Child Actions:</p>
        ) : undefined}
        {actionDisplay}
        {evidence ? (
          <p className="details-description">Evidence:</p>
        ) : undefined}
        {evidenceDisplay}
        {applicability ? (
          <p className="details-description">Applicabilities:</p>
        ) : undefined}
        {applicabilities}
        {caseFeature ? (
          <p className="details-description">Case Features:</p>
        ) : undefined}
        {caseFeatures}
      </div>
    </div>
  )
}

export default DetailsSection
