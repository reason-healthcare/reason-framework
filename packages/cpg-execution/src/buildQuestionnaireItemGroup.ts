import { v4 as uuidv4 } from "uuid"
import { is, omitCanonicalVersion, getSnapshotDefinition, getPathPrefix } from "./helpers"
import Resolver from './resolver'
import lodashGet from 'lodash/get'
import { initial } from "lodash"

/**
* @param structureDefinition.url the structure definition URL
* @param structureDefinition the strucutre definition passed to $questionnaire
* @param subGroupElements a list of element definitions to be processed as an questionnaire item grouping
* @param parentElementPath the primary element path for the group
* @param featureExpresionResource resolved resource from featureExpression extension
* @returns Questionnaire Item List
*/

export const buildQuestionnaireItemGroup = async (structureDefinition: fhir4.StructureDefinition, parentElementPath: fhir4.ElementDefinition["path"], subGroupElements: fhir4.ElementDefinition[], featureExpressionResource?: any): Promise<fhir4.QuestionnaireItem[]> => {

    //TODO
    // 1. determine how readOnly will be used
    // 2. Reference, Quantity and Coding are currently returned as a group type if there are constraints on child elements. If there are only contraints on the backbone, returned as reference, quanitity, coding types with no children - is this how we should handle this?
    // 3. Support Slicing - Bug: returns duplicate items
    // 4. binding.ValueSet should translate to item.answerOption using expansion

  const childElements = subGroupElements.filter(e => getPathPrefix(e.path) === parentElementPath)

  const subGroup = await Promise.all(childElements.map(async (element) => {
    let item = {
      linkId: uuidv4(),
    } as fhir4.QuestionnaireItem

    let snapshotDefinition = getSnapshotDefinition(structureDefinition?.snapshot?.element, element)

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

    if (element.sliceName) {
      item.definition = `${structureDefinition.url}#${elementPath}:${element.sliceName}`
    } else {
      item.definition = `${structureDefinition.url}#${elementPath}`
    }

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
    } else if (elementType === "instant") {
      item.type = "dateTime"
      valueType = "DateTime"
    } else if (elementType === "base64Binary" || elementType === "markdown" || elementType === "id") {
      item.type = "string"
      valueType = "String"
    } else if (elementType === "Quantity" || elementType === "Age" || elementType === "Distance" || elementType === "Duration" ||elementType === "Count" || elementType === "MoneyQuantity" || elementType === "SimpleQuantity") {
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

    let binding = element.binding || snapshotDefinition?.binding
    if (binding) {
      item.answerValueSet = omitCanonicalVersion(binding.valueSet)
      // if (binding.strength === "example") {
      //   item.type = "open-choice"
      // }
    }

    let initialValue
    let fixedElementKey = Object.keys(element).find(k => { return k.startsWith("fixed") || k.startsWith("pattern") || k.startsWith("defaultValue") })
    if (fixedElementKey) {
      // Add "hidden" extension for fixed[x] and pattern[x]
      if (fixedElementKey.startsWith("fixed") || fixedElementKey.startsWith("pattern")) {
        item.extension = [{
          url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
          valueBoolean: true
        }]
      }

      // Set initial[x] from fixed[x], pattern[x], defaultValue[x], or featureExpression
      if (elementType === "CodeableConcept") {
        initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition] as fhir4.CodeableConcept | undefined
        item.initial = initialValue?.coding?.map(coding => {
          return {"valueCoding": coding}
        })
      } else if (elementType === "code") {
        // Bug: need codesystem, not valueset - or can we return soley the code with item.answerValueSet?
        initialValue = {} as fhir4.Coding
        // initialValue.system = omitCanonicalVersion(binding.valueSet)
        initialValue.code = element[fixedElementKey as keyof fhir4.ElementDefinition] as string
      } else {
        initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition]
      }
    } else if (featureExpressionResource) {
      let featureExpressionKey = elementPath.split('.').pop()
      if (element.path.endsWith('[x]') && valueType) {
        featureExpressionKey = featureExpressionKey?.replace(valueType, '')
      }
      // Is there a better way to access the CQL values?
      // TODO
        // 1. iterate over repeating values, currently using the first value
        // 2. handle code / CodeableConcept / Quantity
        // 3. Fix reference (may have other properties)

      let featureExpressionValue
      (featureExpressionKey && featureExpressionResource[featureExpressionKey]) ? featureExpressionValue = featureExpressionResource[featureExpressionKey][0] || featureExpressionResource[featureExpressionKey] : null

      if (featureExpressionValue) {
        if (valueType && valueType === 'Reference') {
          initialValue = {} as fhir4.Reference
          initialValue.reference = featureExpressionValue[valueType.toLowerCase()].value
        } else {
          initialValue = featureExpressionValue.value
        }
      }
      // Add hidden extension for all case feature elements except 'value'
      if (featureExpressionKey !== 'value') {
        item.extension = [{
          url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
          valueBoolean: true
        }]
      }
    }

    if (valueType && initialValue && elementType !== "CodeableConcept") {
      item.initial = [{[`value${valueType}`]: initialValue}]
    }
    // TODO: (may remove) Context from where the corresponding data-requirement is used with a special extension (e.g. PlanDefinition.action.input[extension]...)? or.....

    const childSubGroupElements = subGroupElements.filter(e => e.path.startsWith(`${element.path}.`) && element.path !== e.path)
    if (childSubGroupElements.length !== 0) {
      item.type = "group"
      processAsGroup = true
    }

    if (processAsGroup && (elementType === "BackboneElement" || elementType === "Element" || elementType === "CodeableConcept" || elementType === "Coding" || elementType === "Reference" || elementType === "Quantity")) {

      item.item = await buildQuestionnaireItemGroup(structureDefinition, element.path, childSubGroupElements)

    } else if (processAsGroup && elementType) {
      const fhirRestEndpoint: fhir4.Endpoint = {
        resourceType: 'Endpoint',
        address: "http://hapi.fhir.org/baseR4",
        status: 'active',
        payloadType: [
          {
            coding: [
              {
                code: 'all',
              },
            ],
          },
        ],
        connectionType: {
          code: "hl7-fhir-rest",
        },
      }
      const resolver = Resolver(fhirRestEndpoint)

      let dataTypeSD = await resolver.resolveReference(`StructureDefinition/${elementType}`)
      if (is.StructureDefinition(dataTypeSD) && dataTypeSD.differential) {
        const dataTypeDifferential = dataTypeSD.differential.element.map((e: fhir4.ElementDefinition) => {
          if (elementType) {
            return e = {...e, path: e.path.replace(elementType, element.path)}
          }
        })

        dataTypeDifferential?.forEach(dataTypeElement => {
          if (dataTypeElement) {
            let prefix: string
            if (dataTypeElement?.path.includes("[x]")) {
              prefix = dataTypeElement.path.replace("[x]", "")
            }
            if (!childSubGroupElements.some(e => e.path.startsWith(prefix) || e.path === dataTypeElement?.path))

            childSubGroupElements.push(dataTypeElement)
          }
        })
      }

      item.item = await buildQuestionnaireItemGroup(structureDefinition, element.path, childSubGroupElements)

    }

    return item

  }))

  return subGroup
}