import { v4 as uuidv4 } from "uuid"
import { is, questionnaireBaseUrl } from "./helpers"
import { Coding } from "fhir/r4"

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
    status: "draft",
  }

  questionnaire.url = `${questionnaireBaseUrl}/Questionnaire/${questionnaire.id}`

  // Get only differential elements and snapshot elements with cardinality of 1
  let backboneElement
  if (structureDefinition.differential) {
    backboneElement = structureDefinition.differential.element.shift()
  } else {
    backboneElement = structureDefinition.snapshot?.element.shift()
  }

  let subGroupElements: fhir4.ElementDefinition[] | undefined = structureDefinition?.differential?.element

  const elementIsRootOrHasParent = (element: fhir4.ElementDefinition, subGroupElements: fhir4.ElementDefinition[] | undefined) => {
    const pathList = element.path.split(".")
    // elements with length of 2 are root elements that should be included if min > 1 i.e. Observation.status
    if (pathList.length === 2) {
      return true
    }
    // if the path prefix matches an item already in the array of subGroupElements, its parent has a cardinality of 1 and the element should be considered for processing
    pathList.pop()
    const pathPrefix = pathList.join(".")
    return subGroupElements?.some(e => pathPrefix === e.path)
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

  const getSnapshotElement = (element: fhir4.ElementDefinition) => {
    return structureDefinition.snapshot?.element.find(e => e.path === element.path)
  }

  if (supportedOnly === true) {
    subGroupElements = subGroupElements?.filter(e => e.mustSupport === true || getSnapshotElement(e)?.mustSupport === true)
  }

  // TODO: add item grouping for complex data structures i.e. if element path is nested beyond element.x, group the element.x children together - abstract this into a processSubGroupElements function
  if (subGroupElements) {

    const questionnaireItemsSubGroup = subGroupElements.map((element) => {
      let item = {
        linkId: uuidv4(),
      } as fhir4.QuestionnaireItem

      let elementType: fhir4.ElementDefinitionType["code"] | undefined
      if (element.type) {
        elementType = element.type[0].code
      } else {
        let snapshotElement = getSnapshotElement(element)
        if (snapshotElement?.type) {
          elementType = snapshotElement.type[0].code
        }
      }

      // map element definition types to item types and initial value types
      let valueType
      if (elementType === "code" || elementType === "CodeableConcept" || elementType === "Coding") {
        item.type = "choice"
        valueType = "coding"
      } else if (elementType === "canonical" || elementType === "uri") {
        item.type = "url"
        valueType = "uri"
      } else if (elementType === "uuid" || elementType === "oid") {
        item.type = "string"
        valueType = "uri"
      } else if (elementType === "unsignedInt" || elementType === "positiveInt") {
        item.type = "integer"
        valueType = "integer"
      } else if (elementType && elementType === "instant") {
        item.type = "dateTime"
        valueType = "dateTime"
      } else if (elementType === "base64Binary") {
        item.type = "string"
        valueType = "string"
      } else if (elementType && is.QuestionnaireItemType(elementType)) {
        item.type = elementType
        valueType = elementType
        // TODO: Process complex with $questionnaire instead of using string as data type
      } else {
        item.type = "string"
        valueType = "string"
      }

      let binding = element.binding || getSnapshotElement(element)?.binding
      if (binding && binding.strength === "example") {
        item.answerValueSet = binding.valueSet
        item.type = "open-choice"
      } else if (binding) {
        item.answerValueSet = binding.valueSet
        item.type = "choice"
      }

      // Documentation on ElementDefinition states that default value "only exists so that default values may be defined in logical models", so do we need to support?
      let fixedElementKey = Object.keys(element).find(k => { return k.startsWith("fixed") || k.startsWith("pattern") || k.startsWith("defaultValue") })
      if (fixedElementKey) {
        // Add "hidden" extension for fixed[x] and pattern[x]
        if (fixedElementKey.startsWith("fixed") || fixedElementKey.startsWith("pattern")) {
          item.extension = [{
            url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
            valueBoolean: true
          }]
        }

        // Set initial[x] for fixed[x], pattern[x], defaultValue[x]
        let initialValue
        if (elementType === "CodeableConcept") {
          initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition] as fhir4.CodeableConcept | undefined
          if (initialValue && initialValue.coding) {
            initialValue = initialValue?.coding[0]
          } else if (initialValue && initialValue.text) {
            initialValue = initialValue.text
            valueType = "string"
          }
        } else if (elementType === "code" && item.answerValueSet) {
          initialValue = {} as Coding
          initialValue.system = item.answerValueSet
          initialValue.code = element[fixedElementKey as keyof fhir4.ElementDefinition] as string
        } else {
          initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition]
        }
        // TODO: How do we handle type coercion here? Is there a better way to check the fixed[x] and pattern[x] types?

        const ucValueType = valueType.charAt(0).toUpperCase() + valueType.slice(1)
        // TO Do: depending on data type, initial Value may need to be handled differently - ie CodeableConcept
        if (initialValue) {
          item.initial = [{[`value${ucValueType}`]: initialValue}]
        }
      }

      // TODO: (may remove) Context from where the corresponding data-requirement is used with a special extension (e.g. PlanDefinition.action.input[extension]...)? or.....

      const getElementPath = (element: fhir4.ElementDefinition, elementType?: fhir4.ElementDefinitionType["code"]) => {
        if (element.path.includes("[x]") && elementType) {
          element.path.replace("[x]", (elementType.charAt(0).toUpperCase() + elementType.slice(1)))
        } else {
          return element.path
        }
      }

      // QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where: * "full element path" is path with `[x]` replaced with the first (and only) type.code
      item.definition = `${structureDefinition.url}#${getElementPath(element, elementType)}`

      if (element.short) {
        item.text = element.short
      } else if (getSnapshotElement(element)?.short) {
        item.text = getSnapshotElement(element)?.short
      } else if (element.label) {
        item.text = element.label
      } else if (getSnapshotElement(element)?.label) {
        item.text = getSnapshotElement(element)?.label
      } else {
        item.text = getElementPath(element, elementType)?.split('.').join(' ')
      }

      if (element.min && element.min > 0) {
        item.required = true
      } else if (!element.min) {
        let snapshotElement = getSnapshotElement(element)
        if (snapshotElement?.min && snapshotElement.min > 0) {
          item.required = true
        }
      }

      if (element.max && (element.max === "*" || parseInt(element.max) > 1)) {
        item.repeats = true
      } else if (!element.max) {
        let snapshotElement = getSnapshotElement(element)
        if (snapshotElement?.max && (snapshotElement.max === "*" || parseInt(snapshotElement.max) > 1)) {
          item.repeats = true
        }
      }

      if (element.maxLength && item.type === "string") {
        item.maxLength = element.maxLength
      }

      return item
    })

    questionnaire.item = [{
      linkId: uuidv4(),
      definition: `${structureDefinition.url}#${backboneElement?.path}`,
      text: backboneElement?.path,
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
      type: "string", // use item.type here?
      readOnly: true,
      initial: [{
        valueString: "placeholder for feature expression"
      }]
    })

    // TODO: QuestionnaireItem.readOnly => Context from the corresponding data-requirement (???)
    // 1. Resolve library canonical
    // 2. If library.DataRequirement, create new items for each data type with readOnly = true
  }

  return questionnaire
}
