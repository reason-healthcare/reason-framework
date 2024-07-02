import { FhirResource } from 'fhir/r2'
import {
  formatCodeableConcept,
  is,
  notEmpty,
  resolveCanonical,
  resolveReference,
} from '../helpers'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import FileResolver from 'resolver/file'
import SingleDisplayItem from './SingleDisplayItem'
import { Link } from 'react-router-dom'
import ListDisplayItem from './ListDisplayItem'
import BackButton from './BackButton'

interface InputDetailsProps {
  resolver: FileResolver | BrowserResolver | undefined
}

const InputDetails = ({ resolver }: InputDetailsProps) => {
  const [resource, setResource] = useState<
    fhir4.StructureDefinition | undefined
  >()

  // Get pathname and format as resource reference
  const path = useLocation().pathname.split('')
  path.shift()
  const reference = path.join('')

  useEffect(() => {
    if (resolver instanceof BrowserResolver) {
      const result = resolveReference(reference, resolver)
      if (is.StructureDefinition(result)) {
        setResource(result)
      }
    }
  }, [])

  let navigate = useNavigate()

  if (resource) {
    const { description, type, differential, extension } = resource

    // {differential?.element?.forEach(e => {
    //   if (e.path.split(".").pop() === "code" && e.patternCodeableConcept?.coding) {
    //     <SingleDisplayItem content={`${e.patternCodeableConcept?.coding[0].code} from ${e.patternCodeableConcept?.coding[0].system}`} header='Code'/>
    //   }
    // })
    // }
    const caseFeatureExtensions = extension
      ?.map((e) => {
        let extensionName
        switch (e.url) {
          case 'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression':
            extensionName = 'CPG Feature Expression'
            break
          case 'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-assertionExpression':
            extensionName = 'CPG Assertion Expression'
            break
          case 'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-inferenceExpression':
            extensionName = 'CPG Inference Expression'
            break
          default:
            break
        }
        if (extensionName && e.valueExpression) {
          const { expression, language, reference } = e.valueExpression
          let library: fhir4.Library | undefined
          if (resolver) {
            const rawResource = resolveCanonical(reference, resolver)
            if (is.Library(rawResource)) {
              library = rawResource
            }
          }
          return (
            <li key={e.url}>
              {extensionName}: {expression} from{' '}
              {library != null ? (
                <Link
                  onClick={() => navigate(`/Library/${library?.id}`)}
                  to={`/Library/${library?.id}`}
                >
                  {library?.title ?? library?.name}
                </Link>
              ) : (
                reference
              )}
            </li>
          )
        }
        return null
      })
      .filter(notEmpty)

    const differentialDisplay = differential?.element
      ?.map((e) => {
        if (e.path.split('.').length > 1) {
          if (e.patternCodeableConcept) {
          }
          return (
            <li key={e.path}>
              {e.path}
              {e.type ? ` of type ${e.type[0].code}` : null}
              {e.patternCode
                ? ` as code '${e.patternCode}'`
                : e.patternCodeableConcept
                ? ` as codeableConcept`
                : null}
              {e.patternCodeableConcept && (
                <ul>
                  {formatCodeableConcept(e.patternCodeableConcept, resolver)}
                </ul>
              )}
            </li>
          )
        }
      })
      .filter(notEmpty)

    return (
      <>
        <h2>{resource.title ?? resource.name ?? resource.id}</h2>
        <SingleDisplayItem content={description} header="Description" />
        <ListDisplayItem heading="Extensions" content={caseFeatureExtensions} />
        <ListDisplayItem heading="Differential" content={differentialDisplay} />
        <BackButton />
      </>
    )
  }

  return (
    <>
      <p>Unable to load details</p>
      <BackButton />
    </>
  )
}

export default InputDetails
