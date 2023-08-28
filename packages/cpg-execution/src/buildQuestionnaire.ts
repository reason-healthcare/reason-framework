import { v4 as uuidv4 } from "uuid"
import { questionnaireBaseUrl, getSnapshotElement, getPathPrefix } from "./helpers"
import {buildQuestionnaireItemsSubGroups} from "./buildQuestionnaireSubGroups"

export interface BuildQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition,
  supportedOnly?: boolean | undefined
}

export const buildQuestionnaire = (
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

  // TODO: change logic here in case elements are not in order - look for path length of 1?
  const backboneElement: fhir4.ElementDefinition | undefined = structureDefinition.differential?.element.shift() || structureDefinition.snapshot?.element.shift()

  let subGroupElements: fhir4.ElementDefinition[] | undefined = structureDefinition?.differential?.element

  // TODO: this logic is currently dependent on the subGroupElements being in order - refactor in case a parent element does not preceed a child element
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
    subGroupElements = subGroupElements?.filter(e => e.mustSupport === true || getSnapshotElement(structureDefinition, e)?.mustSupport === true)
  }

  questionnaire.item = [{
    linkId: uuidv4(),
    definition: `${structureDefinition.url}#${backboneElement?.path}`,
    text: backboneElement?.path,
    type: "group",
    item: []
  }]

  if (subGroupElements) {

    let rootElements = subGroupElements.filter(e => e.path.split(".").length === 2)
    // console.log(JSON.stringify(rootElements) + "re")

    const subGroupItems = buildQuestionnaireItemsSubGroups(structureDefinition, rootElements, subGroupElements!)

    // console.log(JSON.stringify(subGroupElements) + "sg")

    questionnaire.item = [{
      linkId: uuidv4(),
      definition: `${structureDefinition.url}#${backboneElement?.path}`,
      text: `${backboneElement?.path} Group`,
      type: "group",
      item: subGroupItems
    }]
  }
  return questionnaire
}
