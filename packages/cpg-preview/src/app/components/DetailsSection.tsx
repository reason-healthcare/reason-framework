import '@/styles/detailsSection.css'

interface DetailsSectionProps {
  details: fhir4.PlanDefinition | fhir4.PlanDefinitionAction | undefined
}
const DetailsSection = ({ details }: DetailsSectionProps) => {
  console.log(details)
  return(
    <div className="container">
      {details?.title}
    </div>
  )

}

export default DetailsSection