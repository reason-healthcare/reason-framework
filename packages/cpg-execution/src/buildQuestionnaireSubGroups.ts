import { v4 as uuidv4 } from "uuid"
import { is, omitCanonicalVersion, getBaseDefinition, getPathPrefix } from "./helpers"
import axios from 'axios'

export const buildQuestionnaireItemsSubGroups = async (definitionUrl: string, baseStructure: fhir4.StructureDefinitionDifferential["element"] | fhir4.StructureDefinitionSnapshot["element"], rootElements: fhir4.ElementDefinition[], subGroupElements: fhir4.ElementDefinition[]): Promise<fhir4.QuestionnaireItem[]> => {

    //TODO
    // 1. support case feature expressions
    // 2. determine how readOnly will be used

  const subGroup = await Promise.all(rootElements.map(async (element) => {
    let item = {
      linkId: uuidv4(),
    } as fhir4.QuestionnaireItem

    let baseDefinition = getBaseDefinition(baseStructure, element)

    let elementType: fhir4.ElementDefinitionType["code"] | undefined
    if (element.type) {
      elementType = element.type[0].code
    } else if (baseDefinition?.type) {
      elementType = baseDefinition.type[0].code
    }

    let elementPath: fhir4.ElementDefinition["path"]
    if (element.path.includes("[x]") && elementType) {
      elementPath = element.path.replace("[x]", (elementType.charAt(0).toUpperCase() + elementType.slice(1)))
    } else {
      elementPath = element.path
    }

    item.definition = `${definitionUrl}#${elementPath}`

    if (element.short) {
      item.text = element.short
    } else if (baseDefinition?.short) {
      item.text = baseDefinition?.short
    } else if (element.label) {
      item.text = element.label
    } else if (baseDefinition?.label) {
      item.text = baseDefinition?.label
    } else {
      item.text = elementPath?.split('.').join(' ')
    }

    let processAsComplexType = false
    let valueType
    if (elementType === "code" || elementType === "CodeableConcept" || elementType === "Coding") {
      item.type = "choice"
      valueType = "Coding"
    } else if (elementType === "canonical" || elementType === "uri") {
      item.type = "url"
      valueType = "Uri"
    } else if (elementType === "uuid" || elementType === "oid") {
      item.type = "string"
      valueType = "Uri"
    } else if (elementType === "unsignedInt" || elementType === "positiveInt") {
      item.type = "integer"
      valueType = "Integer"
    } else if (elementType && elementType === "instant") {
      item.type = "dateTime"
      valueType = "DateTime"
    } else if (elementType === "base64Binary" || elementType === "markdown" || elementType === "id") {
      item.type = "string"
      valueType = "String"
    } else if (elementType === "Quantity" || elementType === "Age" || elementType === "Distance" || elementType === "Duration" ||elementType === "Count" || elementType === "MoneyQuantity" || elementType === "SimpleQuantity") { // TODO: write test for this with fixedDuration and handle bindings
      item.type = "quantity"
      valueType = "Quantity"
    } else if (elementType === "Reference") {
      item.type = "reference"
      valueType = "Reference"
    } else if (elementType && is.QuestionnaireItemType(elementType)) {
      item.type = elementType
      valueType = elementType.charAt(0).toUpperCase() + elementType.slice(1)
    } else {
      item.type = "group"
      processAsComplexType = true
    }

    if (processAsComplexType) {

      let childElements = subGroupElements.filter(e => getPathPrefix(e.path) === elementPath)
      if (childElements && elementType === "BackboneElement" || elementType === "Element") {
        item.item = await buildQuestionnaireItemsSubGroups(definitionUrl, baseStructure, childElements, subGroupElements)

      } else if (childElements && elementType) {

        const getDataTypeDefinition = async (elementType: fhir4.ElementDefinitionType["code"]) => {
          try{
            const response = await axios.get(`http://hapi.fhir.org/baseR4/StructureDefinition/${elementType}`)
            return response.data
          } catch (error) {
            if (axios.isAxiosError(error)) {
              console.error(error.message)
            } else {
              console.error(error)
            }
          }
        }

        // TODO: refactor this block because intent is unclear

        let dataTypeDefinition = await getDataTypeDefinition(elementType)
        dataTypeDefinition = dataTypeDefinition.differential.element.map((e: fhir4.ElementDefinition) => {
          if (elementType) {
            return e = {...e, path: e.path.replace(elementType, element.path)}
            // now observation.effectiveTiming.repeat instead of Timing.repeat
          }
        })

        let subGroupElement: fhir4.ElementDefinition | undefined
        dataTypeDefinition.forEach((dataTypeElement: fhir4.ElementDefinition) => {
          let prefix: string
          if (dataTypeElement.path.includes("[x]")) {
            prefix = dataTypeElement.path.replace("[x]", "")
          }
          subGroupElement = subGroupElements.find(el => el.path.startsWith(prefix) || el.path === dataTypeElement.path)
          // if subgroup has the element from the differential, the differential element should be replaced with the subgroup item
          if (subGroupElement && !childElements.some(e => e.path === dataTypeElement.path)) {
            childElements.push(subGroupElement)
          } else if (!childElements.some(e => e.path === dataTypeElement.path)) {
            childElements.push(dataTypeElement)
          }
        })

        let dataTypeRootElements = childElements.filter(e => getPathPrefix(e.path) === element.path)
        item.item = await buildQuestionnaireItemsSubGroups(definitionUrl, baseStructure, dataTypeRootElements, childElements)
      }
    } else {
      // Documentation on ElementDefinition states that default value "only exists so that default values may be defined in logical models", so do we need to support?
      let binding = element.binding || baseDefinition?.binding
      // TODO: there might be a case where the snapshot element has a fixed value when the differential does not?
      let fixedElementKey = Object.keys(element).find(k => { return k.startsWith("fixed") || k.startsWith("pattern") || k.startsWith("defaultValue") })

      if (binding && binding.strength === "example" && !fixedElementKey) {
        item.answerValueSet = omitCanonicalVersion(binding.valueSet)
        item.type = "open-choice"
      } else if (binding && !fixedElementKey) {
        item.answerValueSet = omitCanonicalVersion(binding.valueSet)
      }

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
            valueType = "String"
          }
        } else if (elementType === "code" && binding?.valueSet) {
          initialValue = {} as fhir4.Coding
          initialValue.system = omitCanonicalVersion(binding.valueSet)
          initialValue.code = element[fixedElementKey as keyof fhir4.ElementDefinition] as string
        } else {
          initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition]
        }

        if (valueType) {
          if (initialValue) {
            item.initial = [{[`value${valueType}`]: initialValue}]
          }
        }
      }

      // TODO: (may remove) Context from where the corresponding data-requirement is used with a special extension (e.g. PlanDefinition.action.input[extension]...)? or.....

      if (element.min && element.min > 0) {
        item.required = true
      } else if (!element.min && baseDefinition?.min && baseDefinition.min > 0) {
        item.required = true
      }

      if (element.max && (element.max === "*" || parseInt(element.max) > 1)) {
        item.repeats = true
      } else if (!element.max && baseDefinition?.max && (baseDefinition.max === "*" || parseInt(baseDefinition.max) > 1)) {
        item.repeats = true
      }

      if (element.maxLength && elementType === "string") {
        item.maxLength = element.maxLength
      } else if (!element.maxLength && baseDefinition?.maxLength && elementType === "string") {
        item.maxLength = baseDefinition.maxLength
      }

    }

    return item
  }))

  return subGroup
}