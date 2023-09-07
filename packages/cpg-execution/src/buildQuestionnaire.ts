import { v4 as uuidv4 } from "uuid"
import { questionnaireBaseUrl, getSnapshotDefinition, getPathPrefix } from "./helpers"
import {buildQuestionnaireItemGroup} from "./buildQuestionnaireItemGroup"
import { processFeatureExpression } from "./expression"
import Resolver from './resolver'

export interface BuildQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition,
  supportedOnly?: boolean | undefined
}

export const buildQuestionnaire = async (
  args: BuildQuestionnaireArgs
) => {

  const {
    structureDefinition,
    supportedOnly,
  } = args

  const questionnaire: fhir4.Questionnaire = {
    id: uuidv4(),
    resourceType: "Questionnaire",
    description: `Questionnaire generated from ${structureDefinition.url}`,
    status: "draft"
  }

  questionnaire.url = `${questionnaireBaseUrl}/Questionnaire/${questionnaire.id}`

  const backboneElement = structureDefinition.snapshot?.element.find(e => e.path === structureDefinition.type)

  // Add differential elements to process first
  let subGroupElements: fhir4.ElementDefinition[] | undefined = structureDefinition?.differential?.element

  const elementIsRootOrHasParent = (element: fhir4.ElementDefinition, subGroupElements: fhir4.ElementDefinition[] | undefined) => {
    if (getPathPrefix(element.path) === backboneElement?.path) {
      return true
    }
    // if the path prefix matches an item already in the array of subGroupElements, its parent has a cardinality of 1 and the element should be considered for processing
    return subGroupElements?.some(e => getPathPrefix(element.path) === e.path)
  }

  // Only add snapshot elements if cardinality of 1 and not in differential
  structureDefinition.snapshot?.element.forEach((element) => {
    if (
        element.min &&
        element.min > 0 &&
        !subGroupElements?.some(e => e.path === element.path) &&
        elementIsRootOrHasParent(element, subGroupElements)
      ) {
      subGroupElements?.push(element)
    }
  })

  if (supportedOnly === true) {
    subGroupElements = subGroupElements?.filter(e => e.mustSupport === true || getSnapshotDefinition(structureDefinition?.snapshot?.element, e)?.mustSupport === true)
  }

  const featureExtension = structureDefinition.extension?.find(e => e.url === "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression")

  if (featureExtension) {
    const featureExpresion = featureExtension.valueExpression

    const connectionTypeCode = process.env.ENDPOINT_ADDRESS?.startsWith('http')
      ? 'hl7-fhir-rest'
      : process.env.ENDPOINT_ADDRESS?.startsWith('file')
      ? 'hl7-fhir-file'
      : 'unknown'

    const endpoint: fhir4.Endpoint = {
      resourceType: 'Endpoint',
      address: process.env.ENDPOINT_ADDRESS ?? 'unknown',
      status: 'active',
      payloadType: [
        {
          coding: [
            {
              code: 'all',
            },
          ],
        },
      ],
      connectionType: {
        code: connectionTypeCode,
      },
    }
    if (featureExpresion) {
      const resolver = Resolver(endpoint)
      const library = await resolver.resolveCanonical(featureExpresion?.reference)
      const value = processFeatureExpression(featureExpresion, structureDefinition, resolver, resolver)
    }
  }

  questionnaire.item = [{
    linkId: uuidv4(),
    definition: `${structureDefinition.url}#${backboneElement?.path}`,
    text: backboneElement?.path,
    type: "group",
    item: []
  }]

  if (subGroupElements && backboneElement) {
    questionnaire.item = [{
      linkId: uuidv4(),
      definition: `${structureDefinition.url}#${backboneElement?.path}`,
      text: backboneElement?.short? backboneElement?.short : backboneElement?.path,
      type: "group",
      item: await buildQuestionnaireItemGroup(structureDefinition, backboneElement.path, subGroupElements)
    }]
  }
  return questionnaire
}
