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

    // QuestionnaireItem.definition => "{definitionUrl}#{full element path}", where: * "full element path" is path with `[x]` replaced with the first (and only) type.code

    let elementPath: fhir4.ElementDefinition["path"]
    if (element.path.includes("[x]") && elementType) {
      elementPath = element.path.replace("[x]", (elementType.charAt(0).toUpperCase() + elementType.slice(1)))
    } else {
      elementPath = element.path
    }

    item.definition = `${definitionUrl}#${elementPath}`

    let processAsComplexType = false
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
    } else if (elementType === "base64Binary" || elementType === "markdown" || elementType === "id") {
      item.type = "string"
      valueType = "string"
    } else if (elementType === "Age" || elementType === "Distance" || elementType === "Duration" ||elementType === "Count" || elementType === "MoneyQuantity" || elementType === "SimpleQuantity") { //TODO: write test for this with fixedDuration and handle bindings
      item.type = "quantity"
      valueType = "quantity"
    } else if (elementType && is.QuestionnaireItemType(elementType)) {
      item.type = elementType
      valueType = elementType
    } else {
      processAsComplexType = true
    }

    if (processAsComplexType) {
      item.type = "group"
      item.text = `${element.path} Group`

      let childElements = subGroupElements.filter(e => getPathPrefix(e.path) === elementPath)
      if (childElements && elementType === "BackboneElement" || elementType === "Element") {
        item.item = await buildQuestionnaireItemsSubGroups(definitionUrl, baseStructure, childElements, subGroupElements)
      } else if (childElements && elementType) {

        const getDataTypeDefinition = async (elementType: fhir4.ElementDefinitionType["code"]) => {
          try{
            const response = await axios.get(`http://hapi.fhir.org/baseR4/StructureDefinition/${elementType}`)
            return response.data
          } catch (error) {
            // console.error(error)
          }
        }

        let dataTypeDefinition = await getDataTypeDefinition(elementType)

        // let dataTypeElements: fhir4.ElementDefinition[] = childElements.map(e => {
        //   if (elementType) {
        //     e = {...e, path:  e.path.replace(element.path, elementType)}
        //   }
        //   return e
        // })

        // Bug: if there is a type specified on differential, that should replace type from SD

        // change path on each snapshot and differential element to match
        dataTypeDefinition = dataTypeDefinition.differential

        dataTypeDefinition = dataTypeDefinition.element.map((e: fhir4.ElementDefinition) => {
          return e = {...e, path: e.path.replace(getPathPrefix(e.path), element.path)}
        })

        // console.log(JSON.stringify(dataTypeDefinition) + 'definition')

        let dataTypeElements = childElements

        dataTypeDefinition.forEach((dataTypeElement: fhir4.ElementDefinition) => {
          if (!dataTypeElements.some(e => e.path === dataTypeElement.path)) {
            dataTypeElements.push(dataTypeElement)
          }
        })
        let dataTypeRootElements = dataTypeElements.filter(e => e.path.split(".").length === 3)
        item.item = await buildQuestionnaireItemsSubGroups(definitionUrl, dataTypeDefinition, dataTypeRootElements, dataTypeElements)
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
            valueType = "string"
          }
        } else if (elementType === "code" && binding?.valueSet) {
          initialValue = {} as fhir4.Coding
          initialValue.system = omitCanonicalVersion(binding.valueSet)
          initialValue.code = element[fixedElementKey as keyof fhir4.ElementDefinition] as string
        } else {
          initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition]
        }

        if (valueType) {
          const ucValueType = valueType.charAt(0).toUpperCase() + valueType.slice(1)
          if (initialValue) {
            item.initial = [{[`value${ucValueType}`]: initialValue}]
          }
        }
      }

      // TODO: (may remove) Context from where the corresponding data-requirement is used with a special extension (e.g. PlanDefinition.action.input[extension]...)? or.....

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