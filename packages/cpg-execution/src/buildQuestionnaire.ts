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
    if (element.min !== undefined && element.min > 0 && !elements?.some(e => e.path === element.path)) {
      elements?.push(element)
    }
  })

  if (supportedOnly === true) {
    elements = elements?.filter(e => e.mustSupport === true)
  }

  console.log(JSON.stringify(elements) + 'elements')

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
      } else if (element.binding) {
        item.type = "choice"
      } else {
        item.type = "string"
      }

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
      // if (element.type && element.type includes a code === 'DataRequirement') {
      //   item.readOnly = true
      // }

      if (element.maxLength && item.type === 'string') {
        item.maxLength = element.maxLength
      }

      // QuestionnaireItem.answerOption => build if the element has a binding to a VS
      // Should this actually be QuestionnaireItem.answerValueSet?
      if (element.binding) {
        item.answerValueSet = element.binding.valueSet
      }

      return item
    })
  }

  // QuestionnaireItem.initialValue => From featureExpression (if available)
  const featureExpressionExtension = structureDefinition.extension?.find(e => e.url === "https://hl7.org/fhir/uv/cpg/StructureDefinition-cpg-featureExpression")
  if (featureExpressionExtension) {

    // How de we resolve expressions without patient context, should be added to parameters for cpg?
    // Which item will have this initial value?

    // {
    //   "url" : "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression",
    //   "valueExpression" : {
    //     "language" : "text/cql-identifier",
    //     "expression" : "Body Weight Change",
    //     "reference" : "http://hl7.org/fhir/uv/cpg/Library/CHF"
    //   }
    // },

  }

  console.log(JSON.stringify(questionnaire) + 'questionnaire')
  return questionnaire
}
