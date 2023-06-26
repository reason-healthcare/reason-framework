import { v4 as uuidv4 } from 'uuid'
import { is } from './helpers'

export interface BuildQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition,
  supportedOnly?: boolean | undefined
}

export const buildQuestionnaire = (
  args: BuildQuestionnaireArgs
): fhir4.Questionnaire | undefined => {

  const {
    structureDefinition,
    supportedOnly,
  } = args

  const questionnaire: fhir4.Questionnaire = {
    id: uuidv4(),
    status: 'draft',
    resourceType: "Questionnaire",
  }

  // get only differential elements and snapshot required elements
  let elements = structureDefinition?.differential?.element
  structureDefinition.snapshot?.element.forEach((element) => {
    if (element.min !== undefined && element.min > 0) {
      elements?.push(element)
    }
  })

  console.log(JSON.stringify(elements) + 'elements')

  // if (supportedOnly === true) {
  //   // filter through differential elements to see which are must support: true
  //   // use these elements to map to questions
  // }

  if (elements) {
    questionnaire.item = elements.map((element) => {
      let item: fhir4.QuestionnaireItem = {
        linkId: uuidv4(),
        definition: `${structureDefinition.url}#${element.path}`,
        type: "string"
      }

      let elementType
      // Check for type on element within list, if not present, the element might be from the differential and type should be used from snapshot
      if (element.type) {
        elementType = element.type
      } else {
        elementType = structureDefinition?.snapshot?.element?.find(e => e.path === element.path)?.type
      }

      if (elementType && is.QuestionnaireItemType(elementType[0].code)) {
        item.type = elementType[0].code
      } else {
        item.type = "string"
      }

      element.path = 'Observation.value[x]'
      elementType = []
      elementType.push({code:'string'})


      // QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where:
      // * "full element path" is path with `[x]` replaced with the first (and only) type.code
      if (element.path.includes('[x]') && elementType) {
        const elementPath = element.path.replace('[x]', (elementType[0].code.charAt(0).toUpperCase() + elementType[0].code.slice(1)))
        item.definition = `${structureDefinition.url}#${elementPath}`
      }

      // Add "hidden" extension for fixed[x] and pattern[x]
      if (Object.keys(element).some(e => { return e.startsWith('fixed') || e.startsWith('pattern') }) ) {
        item.extension = [{
          url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
          valueBoolean: true
        }]
      }

      if (element.label) {
        item.text = element.label
      }

      if (element.min && element.min > 0) {
        item.required = true
      }

      if (element.max && parseInt(element.max) > 1) {
        item.repeats = true
      }

      // QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
      // if (element.type && element.type[0].code === 'DataRequirement') {
      //   item.readOnly = true
      // }

      if (element.maxLength && item.type === 'string') {
        item.maxLength = element.maxLength
      }

      // QuestionnaireItem.initialValue => From featureExpression (if available)

      // QuestionnaireItem.answerOption => build if the element has a binding to a VS

      return item
    })
  }

  console.log(JSON.stringify(questionnaire) + 'questionnaire')
  return questionnaire
}
