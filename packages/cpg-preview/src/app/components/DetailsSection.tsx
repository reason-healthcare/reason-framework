import '@/styles/detailsSection.css'
import {is} from 'helpers'
import {v4} from 'uuid'
import { CloseOutlined } from '@ant-design/icons'

interface DetailsSectionProps {
  details: fhir4.PlanDefinition | fhir4.PlanDefinitionAction | undefined
  setSelected: React.Dispatch<React.SetStateAction<fhir4.PlanDefinition | fhir4.PlanDefinitionAction | fhir4.ActivityDefinition | undefined>>
}

const DetailsSection = ({ details, setSelected }: DetailsSectionProps) => {
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
      {e.type ? e.type.charAt(0).toUpperCase() + e.type.slice(1) : null}
      {e.display || e.label ? <p>{e.display ?? e.label}</p> : null}
      {e.citation ? <p>{e.citation}</p> : null}
      {e.url ? <p><a href={e.url} target="blank">{e.url}</a></p> : null}
      {e.document?.title ? <p><a href="">{e.document.title}</a></p> : null}
      {" "}
    </li>
    )
  })

  const handleClick = () => {
    setSelected(undefined)
  }

  return(
    <div className='details-section'>
      <div className='close'>
        <CloseOutlined onClick={handleClick}/>
      </div>
      <div className="details-container">
        <h2>{header}</h2>
        {description ? (
          <p>
            <span className='details-description'>Description</span><span>: {description}</span>
          </p>
          ) : undefined}
        {" "}
        {selection ? (
          <p>
            <span className='details-description'>Selection Behavior</span><span>: {selection}</span>
          </p>
          ) : undefined}
        {" "}
        {action ? <p className='details-description'>Child Actions:</p> : undefined}
        {actionDisplay}
        {evidence ? <p className='details-description'>Evidence:</p> : undefined}
        {evidenceDisplay}
      </div>
    </div>
  )
}

export default DetailsSection