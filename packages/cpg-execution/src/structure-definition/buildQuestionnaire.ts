import { v4 as uuidv4 } from 'uuid'
import { questionnaireBaseUrl, getPathPrefix, is, inspect } from '../helpers'
import { buildQuestionnaireItemGroup } from './buildQuestionnaireItemGroup'
import Resolver from '../resolver'
import { processFeatureExpression } from '../expression'

export interface EndpointConfiguration {
  artifactRoute?: string | undefined
  endpointUri?: string | undefined
  endpoint: fhir4.Endpoint
}

export interface BuildQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition
  artifactEndpointConfigurable?: EndpointConfiguration[] | undefined
  contentEndpoint?: fhir4.Endpoint | undefined
  terminologyEndpoint?: fhir4.Endpoint | undefined
  supportedOnly?: boolean | undefined
}

export const buildQuestionnaire = async (args: BuildQuestionnaireArgs) => {
  const {
    structureDefinition,
    artifactEndpointConfigurable,
    contentEndpoint,
    terminologyEndpoint,
    supportedOnly
  } = args

  if (!is.StructureDefinition(structureDefinition)) {
    throw new Error(
      `structureDefinition does not seem to be a FHIR StructureDefinition" ${inspect(
        structureDefinition
      )}`
    )
  }

  const questionnaire: fhir4.Questionnaire = {
    id: uuidv4(),
    resourceType: 'Questionnaire',
    description: `Questionnaire generated from ${structureDefinition.url}`,
    status: 'draft'
  }

  questionnaire.url = `${questionnaireBaseUrl}/Questionnaire/${questionnaire.id}`
  const rootElement = structureDefinition.snapshot?.element.find(
    (e) => e.path === structureDefinition.type
  )

  // Add differential elements to process first
  let subGroupElements: fhir4.ElementDefinition[] | undefined =
    structureDefinition?.differential?.element

  const isChildElement = (
    element: fhir4.ElementDefinition,
    subGroupElements: fhir4.ElementDefinition[] | undefined
  ) => {
    if (getPathPrefix(element.path) === rootElement?.path) {
      return true
    }
    // if the path prefix matches an item already in the array of subGroupElements, its parent has a cardinality of 1 and the element should be added for processing
    return subGroupElements?.some((e) => getPathPrefix(element.path) === e.path)
  }

  // Only add snapshot elements if cardinality of 1 and not in differential
  structureDefinition.snapshot?.element.forEach((element) => {
    if (
      element.min &&
      element.min > 0 &&
      !subGroupElements?.some((e) => e.path === element.path) &&
      isChildElement(element, subGroupElements)
    ) {
      subGroupElements?.push(element)
    }
  })

  if (supportedOnly === true) {
    subGroupElements = subGroupElements?.filter((e) => e.mustSupport === true)
  }

  const contentResolver =
    contentEndpoint != null ? Resolver(contentEndpoint) : undefined
  const terminologyResolver =
    terminologyEndpoint != null ? Resolver(terminologyEndpoint) : undefined

  if (subGroupElements && rootElement) {
    questionnaire.item = [
      {
        linkId: uuidv4(),
        definition: `${structureDefinition.url}#${rootElement?.path}`,
        text: rootElement?.short ?? rootElement?.path,
        type: 'group'
      }
    ]

    const featureExpression = structureDefinition.extension?.find(
      (e) =>
        e.url ===
        'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression'
    )?.valueExpression

    let populationContextExpression
    if (featureExpression != null) {
      questionnaire.extension = [
        {
          url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext',
          extension: [
            {
              url: 'name',
              valueCoding: {
                system: 'http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext',
                code: 'patient'
              }
            },
            {
              url: 'type',
              valueCode: 'Patient'
            }
          ]
        }
      ]
      populationContextExpression =  {...featureExpression, name: structureDefinition.name ?? featureExpression.expression ?? structureDefinition.id}
      ;(questionnaire.item[0].extension ||=[]).push({
        url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext',
        valueExpression: populationContextExpression
      })
    }

    questionnaire.item[0].item = await buildQuestionnaireItemGroup(
      structureDefinition,
      rootElement.path,
      subGroupElements,
      terminologyResolver,
      contentResolver,
      artifactEndpointConfigurable,
      populationContextExpression
    )
  }

  return questionnaire
}
