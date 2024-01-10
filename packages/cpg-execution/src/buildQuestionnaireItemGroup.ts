import { v4 as uuidv4 } from "uuid"
import { is, getSnapshotDefinition, getPathPrefix, rankEndpoints, resolveFromConfigurableEndpoints } from "./helpers"
import Resolver from './resolver'
import RestResolver from "./resolver/rest"
import FileResolver from "./resolver/file"
import { EndpointConfiguration } from "./buildQuestionnaire"

/**
* @param structureDefinition the strucutre definition passed to $questionnaire
* @param parentElementPath the primary element path for the group
* @param subGroupElements a list of element definitions to be processed as an questionnaire item grouping
* @param featureExpresionResource resolved resource from featureExpression extension
* @returns Questionnaire Item List
*/

export const buildQuestionnaireItemGroup = async (
    structureDefinition: fhir4.StructureDefinition,
    parentElementPath: fhir4.ElementDefinition["path"],
    subGroupElements: fhir4.ElementDefinition[],
    terminologyResolver?: RestResolver | FileResolver | undefined,
    dataResolver?: RestResolver | FileResolver | undefined,
    contentResolver?: RestResolver| FileResolver | undefined,
    configurableEndpoints?: EndpointConfiguration[] | undefined,
    featureExpressionResource?: any
  ): Promise<fhir4.QuestionnaireItem[]> => {

    //TODO
    // 1. determine how readOnly will be used
    // 2. Reference, Quantity and Coding are currently returned as a group type if there are constraints on child elements. If there are only contraints on the backbone, returned as reference, quanitity, coding types with no children - is this how we should handle this?
    // 3. Support Slicing - Bug: returns duplicate items

  const childElements = subGroupElements.filter(e => getPathPrefix(e.path) === parentElementPath)

  const subGroup = await Promise.all(childElements.map(async (element) => {
    const {
      type,
      path,
      sliceName,
      definition,
      short,
      label,
      min,
      max,
      maxLength,
      binding,
    } = element

    let item = {
      linkId: uuidv4(),
    } as fhir4.QuestionnaireItem

    let snapshotDefinition = getSnapshotDefinition(structureDefinition?.snapshot?.element, element)

    let elementType: fhir4.ElementDefinitionType["code"] | undefined
    if (type) {
      elementType = type[0].code
    } else if (snapshotDefinition?.type) {
      elementType = snapshotDefinition.type[0].code
    }
    if (elementType?.startsWith('http://hl7.org/fhirpath/System.')) {
      elementType = elementType.split('.').pop()?.toLowerCase()
    }

    let elementPath: fhir4.ElementDefinition["path"]
    if (path.includes("[x]") && elementType) {
      elementPath = path.replace("[x]", (elementType.charAt(0).toUpperCase() + elementType.slice(1)))
    } else {
      elementPath = path
    }

    if (sliceName) {
      item.definition = `${structureDefinition.url}#${elementPath}:${sliceName}`
    } else {
      item.definition = `${structureDefinition.url}#${elementPath}`
    }

    if (elementType === "code") {
      item.text = definition || snapshotDefinition?.definition // short is a list of codes for code data type. Definition will be more descriptive.
    } else if (short) {
      item.text = short
    } else if (snapshotDefinition?.short) {
      item.text = snapshotDefinition?.short
    } else if (label) {
      item.text = label
    } else if (snapshotDefinition?.label) {
      item.text = snapshotDefinition?.label
    } else {
      item.text = elementPath?.split('.').join(' ')
    }

    if (min && min > 0) {
      item.required = true
    } else if (!min && snapshotDefinition?.min && snapshotDefinition.min > 0) {
      item.required = true
    }

    if (max && (max === "*" || parseInt(max) > 1)) {
      item.repeats = true
    } else if (!max && snapshotDefinition?.max && (snapshotDefinition.max === "*" || parseInt(snapshotDefinition.max) > 1)) {
      item.repeats = true
    }

    if (maxLength && elementType === "string") {
      item.maxLength = maxLength
    } else if (!maxLength && snapshotDefinition?.maxLength && elementType === "string") {
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

    let elementBinding = binding || snapshotDefinition?.binding
    let valueSetResource: fhir4.ValueSet | undefined
    let rankedEndpoints
    if (configurableEndpoints && elementBinding?.valueSet) {
      rankedEndpoints = rankEndpoints(configurableEndpoints, elementBinding.valueSet)
      try {
        valueSetResource = await resolveFromConfigurableEndpoints(rankedEndpoints, elementBinding.valueSet, "canonical", ["ValueSet"]) as fhir4.ValueSet
      } catch (e) {
        console.warn(`Not able to resolve ValueSet ${elementBinding.valueSet} from configurable endpoint. Will try terminology resolver`)
      }
    }
    if (!valueSetResource && terminologyResolver != null) {
      try {
        valueSetResource = await terminologyResolver.resolveCanonical(elementBinding?.valueSet)
      } catch (e) {
        console.warn(`Not able to find ValueSet ${elementBinding?.valueSet}`)
      }
    }
    // Expansion will be used to resolve codes and to set answerOption
    // Try terminology endpoint if it is a rest endpoint, then try configurable rest endpoints
    let valueSetExpansion: fhir4.ValueSet | undefined
    if (is.ValueSet(valueSetResource)) {
      if (rankedEndpoints) {
        for (let i = 0; i < rankedEndpoints.length; i++) {
          if (rankedEndpoints[i].endpoint.connectionType.code === 'hl7-fhir-rest') {
            const resolver = Resolver(rankedEndpoints[i].endpoint) as RestResolver
            try {
              valueSetExpansion = await resolver.expandValueSet(valueSetResource)
              if (valueSetExpansion) {
                break
              }
            } catch (e) {
              console.warn(`Unable to expand valueset ${valueSetResource.url} at configurable endpoints`)
            }
          }
        }
      } else if (terminologyResolver instanceof RestResolver) {
        valueSetExpansion = await terminologyResolver.expandValueSet(valueSetResource)
      }
    }

    let initialValue
    let fixedElementKey = Object.keys(element).find(k => { return k.startsWith("fixed") || k.startsWith("pattern") || k.startsWith("defaultValue") })
    if (fixedElementKey) {
      // Add "hidden" extension for fixed[x] and pattern[x]
      item.extension = [{
        url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
        valueBoolean: true
      }]
      // Set initial[x] from fixed[x], pattern[x], defaultValue[x], or featureExpression
      if (elementType === "CodeableConcept") {
        initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition] as fhir4.CodeableConcept | undefined
        if (initialValue?.coding?.length) {
          // Should we use multiple codings here if available?
          initialValue = initialValue?.coding[0]
        }
      } else if (elementType === "code") {
        initialValue = {} as fhir4.Coding
        let code = element[fixedElementKey as keyof fhir4.ElementDefinition] as string
        initialValue.code = code
        initialValue.system = valueSetExpansion?.expansion?.contains?.find(i => i.code === code)?.system
      } else {
        initialValue = element[fixedElementKey as keyof fhir4.ElementDefinition]
      }
    } else if (featureExpressionResource) {
      let featureExpressionKey = elementPath.split('.').pop()
      if (path.endsWith('[x]') && valueType) {
        featureExpressionKey = featureExpressionKey?.replace(valueType, '')
      }
      if (featureExpressionKey !== 'value') {
        item.extension = [{
          url: "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
          valueBoolean: true
        }]
      }
      (featureExpressionKey && featureExpressionResource[featureExpressionKey] != null) ? initialValue = featureExpressionResource[featureExpressionKey] : null
    }

    if (valueType != null && initialValue != null) {
      item.initial = [{[`value${valueType}`]: initialValue}]
    }

    // Add elementBinding expansion as answerOption if value is not fixed/pattern
    if (!fixedElementKey && valueSetExpansion?.expansion?.contains && valueSetExpansion?.expansion?.contains.length) {
      item.answerOption = []
      valueSetExpansion.expansion.contains.forEach(i => item.answerOption?.push(i))
    } else if (!fixedElementKey){
      item.answerValueSet = elementBinding?.valueSet
    }

    const childSubGroupElements = subGroupElements.filter(e => e.path.startsWith(`${path}.`) && path !== e.path)
    if (childSubGroupElements.length !== 0) {
      item.type = "group"
      processAsGroup = true
    }

    if (processAsGroup && (elementType === "BackboneElement" || elementType === "Element" || elementType === "CodeableConcept" || elementType === "Coding" || elementType === "Reference" || elementType === "Quantity")) {

      item.item = await buildQuestionnaireItemGroup(structureDefinition, path, childSubGroupElements, terminologyResolver, dataResolver, contentResolver, configurableEndpoints)

    } else if (processAsGroup && elementType) {
      let dataTypeSD
      if (configurableEndpoints && structureDefinition.baseDefinition) {
        const endpoints = rankEndpoints(configurableEndpoints, structureDefinition.baseDefinition)
        dataTypeSD = await resolveFromConfigurableEndpoints(endpoints, `/StructureDefinition/${elementType}`, 'reference')
      } else if (contentResolver) {
        dataTypeSD = await contentResolver?.resolveReference(`/StructureDefinition/${elementType}`)
      }
      if (is.StructureDefinition(dataTypeSD) && dataTypeSD.differential) {
        const dataTypeDifferential = dataTypeSD.differential.element.map((e: fhir4.ElementDefinition) => {
          if (elementType) {
            return e = {...e, path: e.path.replace(elementType, path)}
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

      item.item = await buildQuestionnaireItemGroup(structureDefinition, path, childSubGroupElements, terminologyResolver, dataResolver, contentResolver, configurableEndpoints)
    }

    return item

  }))

  return subGroup
}