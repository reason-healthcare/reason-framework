import { v4 as uuidv4 } from "uuid"
import { is, omitCanonicalVersion, getSnapshotElement, getPathPrefix } from "./helpers"
import axios from 'axios'

export const buildQuestionnaireItemsSubGroups = async (structureDefinition: fhir4.StructureDefinition, rootElements: fhir4.ElementDefinition[], subGroupElements: fhir4.ElementDefinition[]): Promise<fhir4.QuestionnaireItem[]> => {

    //TODO
    // 1. support case feature expressions
    // 2. determine how readOnly will be used

  const subGroup = await Promise.all(rootElements.map(async (element) => {
    let item = {
      linkId: uuidv4(),
    } as fhir4.QuestionnaireItem

    let snapshotElement = getSnapshotElement(structureDefinition, element)

    let elementType: fhir4.ElementDefinitionType["code"] | undefined
    // console.log(JSON.stringify(rootElements) + "rootElements")
    if (element.type) {
      elementType = element.type[0].code
    } else if (snapshotElement?.type) {
      elementType = snapshotElement.type[0].code
    }

    // QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where: * "full element path" is path with `[x]` replaced with the first (and only) type.code

    let elementPath: fhir4.ElementDefinition["path"]
    if (element.path.includes("[x]") && elementType) {
      elementPath = element.path.replace("[x]", (elementType.charAt(0).toUpperCase() + elementType.slice(1)))
    } else {
      elementPath = element.path
    }

    item.definition = `${structureDefinition.url}#${elementPath}`

    let processAsGroup = false
    let valueType
    // TODO: data types that are questionnaire types with only additional constraints can be coerced -> example duration is a quantity with additional constraints
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
    } else {
      processAsGroup = true
    }

    // TODO: this supports backbone element groups but not complex data types
    if (processAsGroup) {
      item.type = "group"
      item.text = `${element.path} Group`
      let childElements = subGroupElements.filter(e => getPathPrefix(e.path) === elementPath)

      if (childElements && elementType === "BackboneElement" || elementType === "Element") {
        item.item = await buildQuestionnaireItemsSubGroups(structureDefinition, childElements, subGroupElements)
      } else if (childElements && elementType) {
        const getDataTypeDefinition = async (elementType: fhir4.ElementDefinitionType["code"]) => {
          try{
            const response = await axios.get(`http://hapi.fhir.org/baseR4/StructureDefinition/${elementType}`)
            return response.data
          } catch (error) {
            console.error(error)
          }
        }

        const dataTypeDefinition: fhir4.StructureDefinition = await getDataTypeDefinition(elementType)
        let dataTypeElements: fhir4.ElementDefinition[] = childElements
        dataTypeDefinition?.differential?.element.forEach(element => {
          if (!dataTypeElements.some(e => e.path === element.path)) {
            dataTypeElements.push(element)
          }
        })
        let dataTypeRootElements = subGroupElements.filter(e => e.path.split(".").length === 2)
        console.log(JSON.stringify(dataTypeElements))
        item.item = await buildQuestionnaireItemsSubGroups(dataTypeDefinition, dataTypeRootElements, dataTypeElements)
      }
    } else {
      // Documentation on ElementDefinition states that default value "only exists so that default values may be defined in logical models", so do we need to support?
      let binding = element.binding || snapshotElement?.binding
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
      } else if (snapshotElement?.short) {
        item.text = snapshotElement?.short
      } else if (element.label) {
        item.text = element.label
      } else if (snapshotElement?.label) {
        item.text = snapshotElement?.label
      } else {
        item.text = elementPath?.split('.').join(' ')
      }

      if (element.min && element.min > 0) {
        item.required = true
      } else if (!element.min && snapshotElement?.min && snapshotElement.min > 0) {
        item.required = true
      }

      if (element.max && (element.max === "*" || parseInt(element.max) > 1)) {
        item.repeats = true
      } else if (!element.max && snapshotElement?.max && (snapshotElement.max === "*" || parseInt(snapshotElement.max) > 1)) {
        item.repeats = true
      }

      if (element.maxLength && elementType === "string") {
        item.maxLength = element.maxLength
      } else if (!element.maxLength && snapshotElement?.maxLength && elementType === "string") {
        item.maxLength = snapshotElement.maxLength
      }

    }

    return item
  }))

  return subGroup
}