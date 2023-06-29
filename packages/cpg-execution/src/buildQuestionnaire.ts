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

    const questionnaireItemsSubGroup = elements.map((element) => {
      let item: fhir4.QuestionnaireItem = {
        linkId: uuidv4(),
        definition: `${structureDefinition.url}#${element.path}`,
        type: "string",
      }

      // Check for type on element within list, if not present, the element might be from the differential and type should be used from snapshot
      let elementType
      if (element.type) {
        elementType = element.type
      } else {
        elementType = structureDefinition?.snapshot?.element?.find(e => e.path === element.path)?.type
      }

      if (element.binding) {
        item.type = "choice"
      } else if (elementType && is.QuestionnaireItemType(elementType[0].code)) {
        item.type = elementType[0].code
      } else {
        item.type = "string"
      }

      // QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where:
      // * "full element path" is path with `[x]` replaced with the first (and only) type.code
      if (element.path.includes('[x]') && elementType) {
        const elementPath = element.path.replace('[x]', (elementType[0].code.charAt(0).toUpperCase() + elementType[0].code.slice(1)))
        item.definition = `${structureDefinition.url}#${elementPath}`
      }

      // Get key starting with fixed, pattern, or defaultValue
      let patternOrFixedElementKey  = Object.keys(element).find(k => { return k.startsWith('fixed') || k.startsWith('pattern') || k.startsWith('defaultValue') })

      if (patternOrFixedElementKey) {

        // Add "hidden" extension for fixed[x] and pattern[x]
        if (patternOrFixedElementKey.startsWith('fixed') || patternOrFixedElementKey.startsWith('pattern')) {
          item.extension = [{
            url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
            valueBoolean: true
          }]
        }

        // Set initial[x] for fixed[x], pattern[x], defaultValue[x] - Can there only be one?
        if (!item.initial) {
          item.initial = []
        }
        // TODO: Is there a better way to get data type of the element?
        let elementType
        if (patternOrFixedElementKey.startsWith('fixed')) {
          elementType = patternOrFixedElementKey.replace('fixed', '')
        } else if (patternOrFixedElementKey.startsWith('pattern')) {
          elementType = patternOrFixedElementKey.replace('pattern', '')
        } else if (patternOrFixedElementKey.startsWith('defaultValue')) {
          elementType = patternOrFixedElementKey.replace('defaultValue', '')
        }

        let initialValueKey = `value${elementType}`
        let initialValue = element[patternOrFixedElementKey as keyof fhir4.ElementDefinition]
        let initialValueObject: any = {}
        // TODO: Is there a way to check elementType against allowed fhirR4.QuestionnaireItemInitial types instead of checking against this array?
        const initialValueTypes = ["valueBoolean", "valueDecimal", "valueInteger", "valueDate", "valueDateTime", "valueTime", "valueString", "valueUri", "valueAttachment", "valueCoding","valueQuantity", "valueReference"]

        if (elementType && initialValueTypes.includes(elementType)) {
          initialValueObject[initialValueKey] = initialValue
        } else {
          // TODO: what do we want to do with the datatype here?
          // initialValueObject = {
          //   "valueString": initialValue.toString()
          // }
        }

        item.initial.push(initialValueObject)
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

    questionnaire.item = [{
      linkId: uuidv4(),
      type: "group",
      item: questionnaireItemsSubGroup
    }]
  }

  // TODO: QuestionnaireItem.initialValue => From featureExpression (if available)
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

    // TODO: QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
    // 1. Resolve library canonical
    // 2. If library.DataRequirement, create new items for each data type with type = "display" and readOnly = true
  }

  console.log(JSON.stringify(questionnaire) + 'questionnaire')
  return questionnaire
}
