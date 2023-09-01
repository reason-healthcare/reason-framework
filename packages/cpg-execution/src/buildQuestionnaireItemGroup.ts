import { v4 as uuidv4 } from "uuid"
import { is, omitCanonicalVersion, getSnapshotDefinition, getPathPrefix } from "./helpers"
import axios from 'axios'

/**
* @param SDUrl the structure definition URL
* @param structureDefinitionSnapshot elements from the strucutre definition passed to $questionnaire
* @param subGroupElements a list of element definitions to be processed as an questionnaire item grouping
* @param parentElementPath the primary element path for the group
* @returns Questionnaire Item List
*/

export const buildQuestionnaireItemGroup = async (SDUrl: string, structureDefinitionSnapshot: fhir4.StructureDefinitionSnapshot["element"], parentElementPath: fhir4.ElementDefinition["path"], subGroupElements: fhir4.ElementDefinition[]): Promise<fhir4.QuestionnaireItem[]> => {

    //TODO
    // 1. support case feature expressions
    // 2. determine how readOnly will be used
    // 3. Reference, Quantity and Coding are currently returned as a group type if there are constraints on child elements. If there are only contraints on the backbone, returned as reference, quanitity, coding types - is this how we should handle this?
    // 4. boundsDuration and boundsPeriod are returned for Timing example

  const childElements = subGroupElements.filter(e => getPathPrefix(e.path) === parentElementPath)

  const subGroup = await Promise.all(childElements.map(async (element) => {
    let item = {
      linkId: uuidv4(),
    } as fhir4.QuestionnaireItem

    let snapshotDefinition = getSnapshotDefinition(structureDefinitionSnapshot, element)

    let elementType: fhir4.ElementDefinitionType["code"] | undefined
    if (element.type) {
      elementType = element.type[0].code
    } else if (snapshotDefinition?.type) {
      elementType = snapshotDefinition.type[0].code
    }

    let elementPath: fhir4.ElementDefinition["path"]
    if (element.path.includes("[x]") && elementType) {
      elementPath = element.path.replace("[x]", (elementType.charAt(0).toUpperCase() + elementType.slice(1)))
    } else {
      elementPath = element.path
    }

    item.definition = `${SDUrl}#${elementPath}`

    if (element.short) {
      item.text = element.short
    } else if (snapshotDefinition?.short) {
      item.text = snapshotDefinition?.short
    } else if (element.label) {
      item.text = element.label
    } else if (snapshotDefinition?.label) {
      item.text = snapshotDefinition?.label
    } else {
      item.text = elementPath?.split('.').join(' ')
    }

    if (element.min && element.min > 0) {
      item.required = true
    } else if (!element.min && snapshotDefinition?.min && snapshotDefinition.min > 0) {
      item.required = true
    }

    if (element.max && (element.max === "*" || parseInt(element.max) > 1)) {
      item.repeats = true
    } else if (!element.max && snapshotDefinition?.max && (snapshotDefinition.max === "*" || parseInt(snapshotDefinition.max) > 1)) {
      item.repeats = true
    }

    if (element.maxLength && elementType === "string") {
      item.maxLength = element.maxLength
    } else if (!element.maxLength && snapshotDefinition?.maxLength && elementType === "string") {
      item.maxLength = snapshotDefinition.maxLength
    }

    let processAsGroup = false
    let valueType
    if (elementType === "code" || elementType === "Coding" || elementType === "CodeableConcept") {
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
      processAsGroup = true
    }

    // Documentation on ElementDefinition states that default value "only exists so that default values may be defined in logical models", so do we need to support?
    let binding = element.binding || snapshotDefinition?.binding
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
        item.initial = initialValue?.coding?.map(coding => {
          return {"valueCoding": coding}
        })
      } else if (elementType === "code" && binding?.valueSet) {
        initialValue = {} as fhir4.Coding
        initialValue.system = omitCanonicalVersion(binding.valueSet)
        initialValue.code = element[fixedElementKey as keyof fhir4.ElementDefinition] as string
      } else {
        initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition]
      }

      if (valueType && initialValue && elementType !== "CodeableConcept") {
        item.initial = [{[`value${valueType}`]: initialValue}]
      }
    }

    // TODO: (may remove) Context from where the corresponding data-requirement is used with a special extension (e.g. PlanDefinition.action.input[extension]...)? or.....

    const childSubGroupElements = subGroupElements.filter(e => e.path.startsWith(`${element.path}.`) && element.path !== e.path)
    if (childSubGroupElements.length !== 0) {
      item.type = "group"
      processAsGroup = true
    }

    if (processAsGroup && (elementType === "BackboneElement" || elementType === "Element" || elementType === "CodeableConcept" || elementType === "Coding" || elementType === "Reference" || elementType === "Quantity")) {

      item.item = await buildQuestionnaireItemGroup(SDUrl, structureDefinitionSnapshot, element.path, childSubGroupElements)

    } else if (processAsGroup && elementType) {

      const getDataTypeSD = async (elementType: fhir4.ElementDefinitionType["code"]) => {
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

      let dataTypeSD = await getDataTypeSD(elementType)
      dataTypeSD = dataTypeSD.differential.element.map((e: fhir4.ElementDefinition) => {
        if (elementType) {
          return e = {...e, path: e.path.replace(elementType, element.path)}
          // now observation.effectiveTiming.repeat instead of Timing.repeat
        }
      })

      dataTypeSD.forEach((dataTypeElement: fhir4.ElementDefinition) => {
        let prefix: string
        if (dataTypeElement.path.includes("[x]")) {
          prefix = dataTypeElement.path.replace("[x]", "")
        }
        if (!childSubGroupElements.some(e => e.path === dataTypeElement.path))
        childSubGroupElements.push(dataTypeElement)
      })

      item.item = await buildQuestionnaireItemGroup(SDUrl, structureDefinitionSnapshot, element.path, childSubGroupElements)

    }

    return item

  }))

  return subGroup
}