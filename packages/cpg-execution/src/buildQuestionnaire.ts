import { v4 as uuidv4 } from 'uuid'
import { is, questionnaireBaseUrl } from './helpers'
import { ElementDefinition } from 'fhir/r4'

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

  // Get only differential elements and snapshot elements with cardinality of 1
  // Todo: instead of using differential, use snapshot in build. Use differential only to determin if the element should be a questionnaire item.
  let elements: ElementDefinition[] | undefined = structureDefinition?.differential?.element

  const elementIsOrHasParent = (element: ElementDefinition, elements: ElementDefinition[] | undefined) => {
    const pathList = element.path.split('.')
    if (pathList.length === 2) {
      return true
    }
    pathList.pop()
    const pathPrefix = pathList.join('.')
    return elements?.some(e => pathPrefix === e.path)
  }

  // Only add snapshot elements if cardinality of 1
  structureDefinition.snapshot?.element.forEach((element) => {
    if (
      element.min !== undefined &&
      element.min > 0 &&
      !elements?.some(e => e.path === element.path) &&
      elementIsOrHasParent(element, elements)
      ) {
      elements?.push(element)
    }
  })

  if (supportedOnly === true) {
    elements = elements?.filter(e => e.mustSupport === true)
  }

  // TODO: add item grouping for complex data structures i.e. if element path is nested beyond element.x, group the element.x children together
  if (elements) {

    const rootElement = elements.shift() //change this to backbone element/ element? or parent for reusability

    const questionnaireItemsSubGroup = elements.map((element) => {
      let item: fhir4.QuestionnaireItem = {
        linkId: uuidv4(),
        definition: `${structureDefinition.url}#${element.path}`,
        type: "string",
      }

      // Check for element type, if not present, the element might be from the differential and type should be used from snapshot
      let elementType
      if (element.type) {
        elementType = element.type
      } else {
        elementType = structureDefinition?.snapshot?.element?.find(e => e.path === element.path)?.type
      }

      if (elementType) {
        console.log(elementType[0].code)
      }

      if (elementType && (elementType[0].code === 'code' || elementType[0].code === 'CodeableConcept') ) {
        item.type = "choice"
        console.log('here')
      } else if (elementType && is.QuestionnaireItemType(elementType[0].code)) {
        item.type = elementType[0].code
      // TODO: Process complex with $questionnaire instead of using string as data type
      } else {
        item.type = "string"
      }

      // Documentation on ElementDefinition states that default value "only exists so that default values may be defined in logical models", so do we need to support?
      let patternOrFixedElementKey  = Object.keys(element).find(k => { return k.startsWith('fixed') || k.startsWith('pattern') || k.startsWith('defaultValue') })
      if (patternOrFixedElementKey) {

        // Add "hidden" extension for fixed[x] and pattern[x]
        if (patternOrFixedElementKey.startsWith('fixed') || patternOrFixedElementKey.startsWith('pattern')) {
          item.extension = [{
            url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
            valueBoolean: true
          }]
        }

        // Set initial[x] for fixed[x], pattern[x], defaultValue[x]
        let initialValue = element[patternOrFixedElementKey as keyof ElementDefinition]
        // TODO: How do we handle type coercion here? Is there a better way to check the fixed[x] and pattern[x] types?
        if (elementType && !is.QuestionnaireItemType(elementType[0].code)) {
          initialValue = initialValue?.toString()
        }

        let initialValueKey
        if (item.type === "url") {
          initialValueKey = "valueUri"
        } else {
          initialValueKey = `value${item.type}`
        }

        item.initial = [{[initialValueKey]: initialValue}]

      }

      // QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where: * "full element path" is path with `[x]` replaced with the first (and only) type.code
      if (element.path.includes('[x]') && elementType) {
        const elementPath = element.path.replace('[x]', (elementType[0].code.charAt(0).toUpperCase() + elementType[0].code.slice(1)))
        item.definition = `${structureDefinition.url}#${elementPath}`
      }

       // TODO: (may remove) Context from where the corresponding data-requirement is used with a special extension (e.g. PlanDefinition.action.input[extension]...)? or.....
      if (element.label) {
        item.text = element.label
      } else {
        let text = element.path
        if (element.path.includes('[x]')) {
          text = element.path.replace('[x]', '')
        }
        //TODO: parse around capital letters i.e. birthDate >> Birth Date and capitalize
        item.text = text.split('.').join(' ')
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
      definition: `${structureDefinition.url}#${rootElement?.path}`,
      text: rootElement?.path,
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
      type: "display", // use item.type here?
      readOnly: true,
      initial: [{
        valueString: 'placeholder for feature expression'
      }]
    })

    // TODO: QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
    // 1. Resolve library canonical
    // 2. If library.DataRequirement, create new items for each data type with readOnly = true
  }

  return questionnaire
}
