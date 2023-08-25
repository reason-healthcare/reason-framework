import { v4 as uuidv4 } from "uuid"
import { is, omitCanonicalVersion, getSnapshotElement, getPathPrefix } from "./helpers"

export const buildQuestionnaireItemsSubGroups = (structureDefinition: fhir4.StructureDefinition, rootElements: fhir4.ElementDefinition[], subGroupElements: fhir4.ElementDefinition[]): fhir4.QuestionnaireItem[] => {

  const subGroup = rootElements.map((element) => {
    let item = {
      linkId: uuidv4(),
    } as fhir4.QuestionnaireItem

    let elementType: fhir4.ElementDefinitionType["code"] | undefined
    // console.log(JSON.stringify(rootElements) + "rootElements")
    if (element.type) {
      elementType = element.type[0].code
    } else {
      let snapshotElement = getSnapshotElement(structureDefinition, element)
      if (snapshotElement?.type) {
        elementType = snapshotElement.type[0].code
      }
    }

    // QuestionnaireItem.definition => "{structureDefinition.url}#{full element path}", where: * "full element path" is path with `[x]` replaced with the first (and only) type.code

    const getElementPath = (element: fhir4.ElementDefinition, elementType?: fhir4.ElementDefinitionType["code"]) => {
      if (element.path.includes("[x]") && elementType) {
        element.path.replace("[x]", (elementType.charAt(0).toUpperCase() + elementType.slice(1)))
      } else {
        return element.path
      }
    }

    item.definition = `${structureDefinition.url}#${getElementPath(element, elementType)}`

    // TODO: this should be an else clause to catch all data types that are not primitive
    if (elementType === "BackboneElement") {
      item.type = "group"
      item.text = `${element.path} Group`
      let subItems = subGroupElements.filter(e => getPathPrefix(e.path) === element.path)
      if (subItems !== undefined) {
        item.item = buildQuestionnaireItemsSubGroups(structureDefinition, subItems, subGroupElements)
      }
    } else {
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
      }

      // Documentation on ElementDefinition states that default value "only exists so that default values may be defined in logical models", so do we need to support?
      let binding = element.binding || getSnapshotElement(structureDefinition, element)?.binding
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
      } else if (getSnapshotElement(structureDefinition, element)?.short) {
        item.text = getSnapshotElement(structureDefinition, element)?.short
      } else if (element.label) {
        item.text = element.label
      } else if (getSnapshotElement(structureDefinition, element)?.label) {
        item.text = getSnapshotElement(structureDefinition, element)?.label
      } else {
        item.text = getElementPath(element, elementType)?.split('.').join(' ')
      }

      if (element.min && element.min > 0) {
        item.required = true
      } else if (!element.min) {
        let snapshotElement = getSnapshotElement(structureDefinition, element)
        if (snapshotElement?.min && snapshotElement.min > 0) {
          item.required = true
        }
      }

      if (element.max && (element.max === "*" || parseInt(element.max) > 1)) {
        item.repeats = true
      } else if (!element.max) {
        let snapshotElement = getSnapshotElement(structureDefinition, element)
        if (snapshotElement?.max && (snapshotElement.max === "*" || parseInt(snapshotElement.max) > 1)) {
          item.repeats = true
        }
      }

      if (element.maxLength && item.type === "string") {
        item.maxLength = element.maxLength
      }

    }
    // console.log(JSON.stringify(item) +'item')
    return item
    })
    // console.log(JSON.stringify(subGroup) + "subgroup")
    return subGroup
  }