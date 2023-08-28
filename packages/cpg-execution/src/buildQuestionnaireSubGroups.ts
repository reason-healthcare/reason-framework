import { v4 as uuidv4 } from "uuid"
import { is, omitCanonicalVersion, getSnapshotElement, getPathPrefix } from "./helpers"

export const buildQuestionnaireItemsSubGroups = (structureDefinition: fhir4.StructureDefinition, rootElements: fhir4.ElementDefinition[], subGroupElements: fhir4.ElementDefinition[]): fhir4.QuestionnaireItem[] => {

    //TODO
    // 1. support case feature expressions
    // 2. determine how readOnly will be used
    // 3. process complex data types

  const complexDifferentialTest = {
    "differential": {
      "element": [
        {
          "id": "Period",
          "extension": [
            {
              "url": "http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status",
              "valueCode": "normative"
            },
            {
              "url": "http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version",
              "valueCode": "4.0.0"
            }
          ],
          "path": "Period",
          "short": "Time range defined by start and end date/time",
          "definition": "A time period defined by a start and end date and optionally time.",
          "comment": "A Period specifies a range of time; the context of use will specify whether the entire range applies (e.g. \"the patient was an inpatient of the hospital for this time range\") or one value from the range applies (e.g. \"give to the patient between these two times\").\n\nPeriod is not used for a duration (a measure of elapsed time). See [Duration](datatypes.html#Duration).",
          "min": 0,
          "max": "*",
          "constraint": [
            {
              "key": "per-1",
              "severity": "error",
              "human": "If present, start SHALL have a lower value than end",
              "expression": "start.hasValue().not() or end.hasValue().not() or (start <= end)",
              "xpath": "not(exists(f:start/@value)) or not(exists(f:end/@value)) or (xs:dateTime(f:start/@value) <= xs:dateTime(f:end/@value))"
            }
          ],
          "mapping": [
            {
              "identity": "v2",
              "map": "DR"
            },
            {
              "identity": "rim",
              "map": "IVL<TS>[lowClosed=\"true\" and highClosed=\"true\"] or URG<TS>[lowClosed=\"true\" and highClosed=\"true\"]"
            }
          ]
        },
        {
          "id": "Period.start",
          "path": "Period.start",
          "short": "Starting time with inclusive boundary",
          "definition": "The start of the period. The boundary is inclusive.",
          "comment": "If the low element is missing, the meaning is that the low boundary is not known.",
          "min": 0,
          "max": "1",
          "type": [
            {
              "code": "dateTime"
            }
          ],
          "condition": [
            "per-1"
          ],
          "isSummary": true,
          "mapping": [
            {
              "identity": "v2",
              "map": "DR.1"
            },
            {
              "identity": "rim",
              "map": "./low"
            }
          ]
        },
        {
          "id": "Period.end",
          "path": "Period.end",
          "short": "End time with inclusive boundary, if not ongoing",
          "definition": "The end of the period. If the end of the period is missing, it means no end was known or planned at the time the instance was created. The start may be in the past, and the end date in the future, which means that period is expected/planned to end at that time.",
          "comment": "The high value includes any matching date/time. i.e. 2012-02-03T10:00:00 is in a period that has an end value of 2012-02-03.",
          "min": 0,
          "max": "1",
          "type": [
            {
              "code": "dateTime"
            }
          ],
          "meaningWhenMissing": "If the end of the period is missing, it means that the period is ongoing",
          "condition": [
            "per-1"
          ],
          "isSummary": true,
          "mapping": [
            {
              "identity": "v2",
              "map": "DR.2"
            },
            {
              "identity": "rim",
              "map": "./high"
            }
          ]
        }
      ]
    }
  }

  const subGroup = rootElements.map((element) => {
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
      //
    }

    // TODO: this should be an else clause to catch all data types that are not primitive
    if (processAsGroup) {
      item.type = "group"
      item.text = `${element.path} Group`
      let subItems = subGroupElements.filter(e => getPathPrefix(e.path) === elementPath)
      if (subItems !== undefined) {
        item.item = buildQuestionnaireItemsSubGroups(structureDefinition, subItems, subGroupElements)
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

    // console.log(JSON.stringify(item) +'item')
    return item
  })
    // console.log(JSON.stringify(subGroup) + "subgroup")
  return subGroup
}