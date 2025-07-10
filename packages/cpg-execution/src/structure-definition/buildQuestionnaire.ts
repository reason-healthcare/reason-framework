import { v4 as uuidv4 } from 'uuid'
import {
  questionnaireBaseUrl,
  getPathPrefix,
  is,
  inspect,
  notEmpty
} from '../helpers'
import { buildQuestionnaireItemGroup } from './buildQuestionnaireItemGroup'
import Resolver from '../resolver'
import {
  CPG_FEATURE_EXPRESSION,
  SDC_QUESTIONNAIRE_LAUNCH_CONTEXT
} from '../constants'

export interface EndpointConfiguration {
  artifactRoute?: string | undefined
  endpointUri?: string | undefined
  endpoint: fhir4.Endpoint
}

export interface BuildQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition
  artifactEndpointConfigurable?: EndpointConfiguration[] | undefined
  contentEndpoint?: fhir4.Endpoint | undefined
  terminologyEndpoint?: fhir4.Endpoint | undefined
  supportedOnly?: boolean | undefined
  minimalOnly?: boolean | undefined
}

export const buildQuestionnaire = async (args: BuildQuestionnaireArgs) => {
  const {
    structureDefinition,
    artifactEndpointConfigurable,
    contentEndpoint,
    terminologyEndpoint,
    supportedOnly,
    minimalOnly
  } = args

  if (!is.StructureDefinition(structureDefinition)) {
    throw new Error(
      `structureDefinition does not seem to be a FHIR StructureDefinition" ${inspect(
        structureDefinition
      )}`
    )
  }

  const {
    type: rootElement,
    url,
    differential,
    snapshot,
    extension
  } = structureDefinition

  const questionnaire: fhir4.Questionnaire = {
    id: uuidv4(),
    resourceType: 'Questionnaire',
    description: `Questionnaire generated from ${url}`,
    status: 'active'
  }

  questionnaire.url = `${questionnaireBaseUrl}/Questionnaire/${questionnaire.id}`

  // Add differential elements to process first
  let elementsToProcess: fhir4.ElementDefinition[] | undefined =
    differential?.element ?? []

  const meta = [
    'meta',
    'id',
    'implicitRules',
    'language',
    'text',
    'contained',
    'extension',
    'modifierExtension'
  ]

  // Add snapshot elements to process if not already in differential
  if (snapshot?.element != null) {
    elementsToProcess = elementsToProcess.concat(
      snapshot?.element.filter(
        (element) =>
          !meta.some((metaElement) =>
            element.path.startsWith(`${rootElement}.${metaElement}`)
          ) && !elementsToProcess?.some((e) => e.path === element.path)
      )
    )
  }

  if (minimalOnly === true) {
    const isFixedValue = (element: fhir4.ElementDefinition) => {
      const keys = Object.keys(element)
      return (
        keys.some((key) => key.startsWith('fixed')) ||
        keys.some((key) => key.startsWith('pattern')) ||
        element.extension?.some(
          (ext) =>
            ext.url ===
            'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue'
        )
      )
    }
    const isChildElement = (
      element: fhir4.ElementDefinition,
      elementsToProcess: fhir4.ElementDefinition[] | undefined
    ) => {
      if (getPathPrefix(element.path) === rootElement) {
        return true
      }
      // if the path prefix matches an item already in the array of elementsToProcess, its parent has a cardinality of 1 and the element should be added for processing
      return elementsToProcess?.some(
        (e) => getPathPrefix(element.path) === e.path
      )
    }
    // Only add snapshot elements if cardinality of 1
    elementsToProcess = elementsToProcess.filter(
      (element) =>
        element.min &&
        element.min > 0 &&
        isChildElement(element, elementsToProcess) &&
        !isFixedValue(element)
    )
  }

  if (supportedOnly === true) {
    elementsToProcess = elementsToProcess?.filter((e) => e.mustSupport === true)
  }

  const contentResolver =
    contentEndpoint != null ? Resolver(contentEndpoint) : undefined
  const terminologyResolver =
    terminologyEndpoint != null ? Resolver(terminologyEndpoint) : undefined

  if (rootElement != null) {
    questionnaire.item = [
      {
        linkId: uuidv4(),
        type: 'group',
        definition: `${structureDefinition.url}#${rootElement}`,
        text:
          structureDefinition.title ?? structureDefinition.name ?? rootElement,
        required: false,
        repeats: true
      }
    ]

    const extractionValueExtensions = structureDefinition.differential?.element
      ?.flatMap((element) => {
        return element.extension
          ?.map((extension) => {
            if (
              extension.url ===
              'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue'
            ) {
              return extension
            }
            return null
          })
          .filter(notEmpty)
      })
      .filter(notEmpty)

    if (extractionValueExtensions != null && extractionValueExtensions.length) {
      const extractDefinitionExtension = {
        extension: [
          {
            url: 'definition',
            valueCanonical: url
          }
        ],
        url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtract'
      }
      questionnaire.item[0].extension = [
        extractDefinitionExtension,
        ...extractionValueExtensions
      ]
    }

    const featureExpression = extension?.find(
      (e) => e.url === CPG_FEATURE_EXPRESSION
    )?.valueExpression

    let populationContextExpression
    if (featureExpression != null) {
      ;(questionnaire.extension ||= []).push({
        url: SDC_QUESTIONNAIRE_LAUNCH_CONTEXT,
        extension: [
          {
            url: 'name',
            valueCoding: {
              system: 'http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext',
              code: 'patient',
              display: 'Patient'
            }
          },
          {
            url: 'type',
            valueCode: 'Patient'
          }
        ]
      })

      populationContextExpression = {
        ...featureExpression,
        name:
          structureDefinition.name ??
          featureExpression.expression ??
          structureDefinition.id
      }
      ;(questionnaire.item[0].extension ||= []).push({
        url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext',
        valueExpression: populationContextExpression
      })
    }

    if (elementsToProcess != null) {
      const childItems = await buildQuestionnaireItemGroup(
        structureDefinition,
        rootElement,
        elementsToProcess,
        terminologyResolver,
        contentResolver,
        artifactEndpointConfigurable,
        populationContextExpression
      )

      if (childItems?.length) {
        questionnaire.item[0].item = childItems
      } else {
        questionnaire.item[0].text = `Error: Problem processing child elements for group item ${questionnaire.item[0].definition}`
      }
    }
  } else {
    throw new Error(
      `Unable to identify root element from structure definition ${structureDefinition.url}`
    )
  }

  return questionnaire
}
