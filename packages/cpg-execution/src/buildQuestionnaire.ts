import { v4 as uuidv4 } from "uuid"
import { questionnaireBaseUrl, getSnapshotDefinition, getPathPrefix, is } from "./helpers"
import {buildQuestionnaireItemGroup} from "./buildQuestionnaireItemGroup"
import { processFeatureExpression } from "./expression"
import Resolver from './resolver'

export interface BuildQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition,
  contentEndpoint: fhir4.Endpoint,
  baseEndpoint: fhir4.Endpoint,
  supportedOnly?: boolean | undefined,
  data?: fhir4.Bundle | undefined,
}

export const buildQuestionnaire = async (
  args: BuildQuestionnaireArgs
) => {

  const {
    structureDefinition,
    contentEndpoint,
    baseEndpoint,
    supportedOnly,
    data
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

  const featureExpression = structureDefinition.extension?.find(e => e.url === "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression")?.valueExpression
  let featureExpressionResource: any
  let extractContextExtension: fhir4.Extension[] | undefined
  const contentResolver = Resolver(contentEndpoint)
  if (featureExpression) {
    featureExpressionResource = await processFeatureExpression(featureExpression, contentResolver, contentResolver, data)
    // For each case feature property, find the corresponding elementDef and add to subGroupElements if not already present
    if (featureExpressionResource) {
      Object.keys(featureExpressionResource).forEach((k) => {
        if (featureExpressionResource[k] && k !== 'meta' && k !== 'id' && k !== 'identifier' && k !== 'extension') {
          structureDefinition?.snapshot?.element.forEach(e => {
            if (featureExpressionResource[k] && e.path.startsWith(backboneElement?.path + '.' + k) && !subGroupElements?.some(el => el.path === e.path)) {
              subGroupElements?.push(e)
            }
          })
        }
      })
      const featureType = featureExpressionResource.extension?.find((e: any) => e.url.value === "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-caseFeatureType")?.value.value
      const assertedFeature = featureType === 'asserted' || featureExpressionResource.id?.value && data?.entry?.find(e => e.resource?.id === featureExpressionResource.id.value) ? true : false
      // If the feature was asserted, the extract context extension should point to the resource to update
      if (assertedFeature) {
        extractContextExtension = [{"url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext", valueExpression: featureExpression}]
      // Otherwise, if a new resource should be created when extracted, resolve the definition type and set valueCode
      } else {
        const canonical = featureExpressionResource.extension?.find((e: any) => e.url.value === "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-instantiatesCaseFeature").value.value
        const definition = await contentResolver.resolveCanonical(canonical)
        definition ? extractContextExtension = [{"url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext", "valueCode": definition.type}] : undefined
      }
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
    questionnaire.item[0].item = await buildQuestionnaireItemGroup(structureDefinition, backboneElement.path, subGroupElements, contentEndpoint, baseEndpoint, featureExpressionResource)
  }

  return questionnaire
}
