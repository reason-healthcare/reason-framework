import { v4 as uuidv4 } from "uuid"
import { questionnaireBaseUrl, getSnapshotDefinition, getPathPrefix, is } from "./helpers"
import {buildQuestionnaireItemGroup} from "./buildQuestionnaireItemGroup"
import { processFeatureExpression } from "./expression"
import Resolver from './resolver'

export interface EndpointConfiguration {
  artifactRoute: string | undefined,
  endpointUri?: string | undefined,
  endpoint: fhir4.Endpoint
}

export interface BuildQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition,
  data?: fhir4.Bundle | undefined,
  dataEndpoint?: fhir4.Endpoint | undefined
  configurableEndpoints?: EndpointConfiguration[] | undefined,
  contentEndpoint: fhir4.Endpoint
  terminologyEndpoint: fhir4.Endpoint,
  supportedOnly?: boolean | undefined,
  baseEndpoint?: fhir4.Endpoint,
}

export const buildQuestionnaire = async (
  args: BuildQuestionnaireArgs
) => {

  const {
    structureDefinition,
    data,
    dataEndpoint,
    configurableEndpoints,
    contentEndpoint,
    terminologyEndpoint,
    supportedOnly,
    baseEndpoint,
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

  const contentResolver = Resolver(contentEndpoint)
  const terminologyResolver = Resolver(terminologyEndpoint)
  const dataResolver = dataEndpoint != null ? Resolver(dataEndpoint) : undefined

  const featureExpression = structureDefinition.extension?.find(e => e.url === "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression")?.valueExpression
  let featureExpressionResource: any
  let extractContextExtension: fhir4.Extension[] | undefined
  if (featureExpression) {
    featureExpressionResource = await processFeatureExpression(featureExpression, configurableEndpoints, terminologyResolver, contentResolver, data, dataResolver)
    if (featureExpressionResource) {
      const featureType = featureExpressionResource.extension?.find((e: any) => e.url.value === "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-caseFeatureType")?.value.value
      const assertedFeature = featureType === 'asserted' || featureExpressionResource.id?.value && data?.entry?.find(e => e.resource?.id === featureExpressionResource.id.value) ? true : false
      // If the feature was asserted, the extract context extension should point to the resource to update
      if (assertedFeature) {
        extractContextExtension = [{"url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext", valueExpression: featureExpression}]
      }
    }
    // Otherwise, if a new resource should be created when extracted, resolve the definition type and set valueCode - this will be set even if featureExpression returns null
    if (!extractContextExtension) {
      extractContextExtension = [{"url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext", "valueCode": structureDefinition.type}]
    }
  }

  if (subGroupElements && backboneElement) {
    questionnaire.item = [{
      linkId: uuidv4(),
      definition: `${structureDefinition.url}#${backboneElement?.path}`,
      text: backboneElement?.short? backboneElement?.short : backboneElement?.path,
      type: "group",
    }]
    extractContextExtension ? questionnaire.item[0].extension = extractContextExtension : undefined
    questionnaire.item[0].item = await buildQuestionnaireItemGroup(structureDefinition, backboneElement.path, subGroupElements, terminologyResolver, baseEndpoint, dataResolver, contentResolver, configurableEndpoints, featureExpressionResource)
  }

  return questionnaire
}
