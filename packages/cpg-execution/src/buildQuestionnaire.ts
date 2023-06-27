import { v4 as uuidv4 } from 'uuid'
import { is, questionnaireBaseUrl } from './helpers'

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
    resourceType: "Questionnaire",
    description: `Questionnaire generated from ${structureDefinition.url}`,
    status: 'draft',
  }

  questionnaire.url = `${questionnaireBaseUrl}/Questionnaire/${questionnaire.id}`

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

  // TODO: add item grouping for complex data structures?
  // If element path is nested beyond element.x, group the element.x children together
  // All other elements, should be grouped as one core group
  if (elements) {
    questionnaire.item = [{
      linkId: uuidv4(),
      type: "group"
    }]

    questionnaire.item[0].item = elements.map((element) => {
      let item: fhir4.QuestionnaireItem = {
        linkId: uuidv4(),
        definition: `${structureDefinition.url}#${element.path}`,
        type: "string",
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
      // Set initial[x] for fixed[x], pattern[x], defaultValue[x] - Can only be one?
      let patternOrFixedElementKey = Object.keys(element).find(k => { return k.startsWith('fixed') || k.startsWith('pattern') || k.startsWith('defaultValue') })
      console.log(patternOrFixedElementKey)
      console.log(element)
      if (patternOrFixedElementKey) {
        let parsedDataType // = patternOrFixedElementKey
        let value // = element[patternOrFixedElementKey]
        let initialValueType = `value${parsedDataType}`
        // item.initial = {
          // initialValueType: value
        // }

        if (patternOrFixedElementKey.startsWith('pattern') || patternOrFixedElementKey.startsWith('fixed')) {
          item.extension = [{
            url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
            valueBoolean: true
          }]
        }
      }

      // TODO: (may remove) Context from where the corresponding data-requirement is used with a special extension (e.g. PlanDefinition.action.input[extension]...)? or.....
      if (element.label) {
        item.text = element.label
      } else {
        let text
        if (element.path.includes('[x]')) {
          text = element.path.replace('[x]', '')
        }
        element.path.split('.').join(' ')
      }

      if (element.min && element.min > 0) {
        item.required = true
      }

      if (element.max && parseInt(element.max) > 1) {
        item.repeats = true
      }

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

    // featureExpressionExtension ==> {
    //   "url" : "http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-featureExpression",
    //   "valueExpression" : {
    //     "language" : "text/cql-identifier",
    //     "expression" : "Body Weight Change",
    //     "reference" : "http://hl7.org/fhir/uv/cpg/Library/CHF"
    //   }
    // },

    // 1. Create item with type = "display"
    // 2. questionnaireItem.initialValue = evaluated from feature expression
    // 3. questionnaireItem.readOnly = true

    if (!questionnaire.item) {
      questionnaire.item = []
    }

    questionnaire.item.push({
      linkId: uuidv4(),
      type: "display",
      readOnly: true,
      initial: [{
        valueString: 'placeholder for feature expression'
      }]
    })

    // QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
    // 1. Resolve library canonical
    // 2. If library.DataRequirement, create new items for each data type with type = "display" and readOnly = true
  }

  console.log(JSON.stringify(questionnaire) + 'questionnaire')
  return questionnaire
}
