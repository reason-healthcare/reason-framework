import { QuestionnaireItem } from "fhir/r4"

export interface CreateQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition,
  supportedOnly?: boolean | undefined
}

export const createQuestionnaire = async (
  args: CreateQuestionnaireArgs
): Promise<fhir4.Questionnaire | undefined> => {

  const {
    structureDefinition,
    supportedOnly,
  } = args

  const questionnaire: fhir4.Questionnaire = {
    id: uuidv4(),
    status: 'draft',
    resourceType: "Questionnaire",
    // group of items
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
      let item: QuestionnaireItem = {
        linkId: uuidv4(),
        definition: `${structureDefinition.url}#${element.path}`,
        type: 'string', // ts placeholder
      }

      //QuestionItem.type (should always be primitive type) =>
      // * If the element type is specified in the differential, map to Questionnaire.type
      // * If the element type is not specified in the differential, use the snapshot type and map to Questionnaire.type

      // if (element.type) {
      //   item.type = element.type[0].code
      // } else {
      //   // find SD snapshot element by path
      //   item.type = structureDefinition?.snapshot?.element?.find(e => e.path === element.path)?.type?[0].code
      // }

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

      if (element.maxLength && item.type === 'string') {
        item.maxLength = element.maxLength
      }

      // QuestionnaireItem.initialValue => From featureExpression (if available)

      // QuestionnaireItem.answerOption => build if the element has a binding to a VS

      return item
    })
  }

  return questionnaire
}
