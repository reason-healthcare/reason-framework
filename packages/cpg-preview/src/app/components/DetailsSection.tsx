import '@/styles/detailsSection.css'
import {is} from 'helpers'
import {v4} from 'uuid'

interface DetailsSectionProps {
  details: fhir4.PlanDefinition | fhir4.PlanDefinitionAction | undefined
}
const DetailsSection = ({ details }: DetailsSectionProps) => {
  if (!details) {
    return(
      <p>Unable to load details</p>
    )
  }
  const {title, description, action} = details
  let header
  let evidence
  let selection
  if (is.planDefinition(details)) {
    const { name, relatedArtifact } = details
    header = `Plan Definition: ${title ?? name}`
    evidence = relatedArtifact
  } else {
    const { documentation, selectionBehavior } = details
    header = `Action: ${title}`
    evidence = documentation
    selection = selectionBehavior
  }

  const actionDisplay = action?.map((a) => a.title ? <li>{a.title}</li> : null)

  const evidenceDisplay = evidence?.map((e) => {
    return(
    <li key={v4()}>
      {e.type.charAt(0).toUpperCase() + e.type.slice(1)}
      <p>{e.display ?? e.label}</p>
      <p>{e.citation}</p>
      <a href={e.url} target="blank">{e.url}</a>
      <a href="">{e.document?.title}</a>
    </li>
    )
  })

  return(
    <div className="details-container">
      <h2>{header}</h2>
      <p>{description ? (
        <>
          <span className='details-description'>Description</span><span>: {description}</span>
        </>
        ) : undefined}</p>
      <p>{selection ? (
        <>
          <span className='details-description'>Selection Behavior</span><span>: {selection}</span>
        </>
        ) : undefined}</p>
      <p>{action ? <p className='details-description'>Child Actions:</p> : undefined}</p>
      {actionDisplay}
      <p>{evidence ? <p className='details-description'>Evidence:</p> : undefined}</p>
      {evidenceDisplay}
    </div>
  )
}

export default DetailsSection