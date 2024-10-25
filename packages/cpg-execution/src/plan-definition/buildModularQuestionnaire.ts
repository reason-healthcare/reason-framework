import {
  buildQuestionnaire,
  BuildQuestionnaireArgs,
  EndpointConfiguration
} from '../structure-definition/buildQuestionnaire'
import {
  is,
  notEmpty,
  questionnaireBaseUrl,
  resolveFromConfigurableEndpoints
} from '../helpers'
import Resolver from '../resolver'
import { v4 as uuidv4 } from 'uuid'

const getNestedPlanDefinitions = async (
  planDefinition: fhir4.PlanDefinition,
  contentEndpoint: fhir4.Endpoint | undefined,
  artifactEndpointConfigurable: EndpointConfiguration[] | undefined
) => {
  let allPlans: fhir4.PlanDefinition[] = [planDefinition]
  let plans = (
    (await Promise.all(
      planDefinition?.action?.flatMap(
        async (action: fhir4.PlanDefinitionAction) => {
          let planDefinition
          if (action.definitionCanonical) {
            let planDefinitionRaw
            if (contentEndpoint != null) {
              const resolver = Resolver(contentEndpoint)
              planDefinitionRaw = await resolver.resolveCanonical(
                action.definitionCanonical
              )
            } else if (artifactEndpointConfigurable != null) {
              planDefinitionRaw = await resolveFromConfigurableEndpoints(
                artifactEndpointConfigurable,
                action.definitionCanonical,
                contentEndpoint
              )
            }
            if (is.PlanDefinition(planDefinitionRaw)) {
              planDefinition = planDefinitionRaw
            }
          }
          return planDefinition
        }
      ) ?? []
    )) as fhir4.PlanDefinition[]
  ).filter(notEmpty)

  if (plans?.length) {
    allPlans = allPlans.concat(plans)
    plans.forEach(async (p) => {
      allPlans = allPlans.concat(
        await getNestedPlanDefinitions(
          p,
          contentEndpoint,
          artifactEndpointConfigurable
        )
      )
    })
  }
  return allPlans
}

const getDataRequirements = (actions: fhir4.PlanDefinitionAction[]) => {
  let allCanonicals: string[] = []
  // For each action, find input and add to list of structureDefinitions
  let canonicals = actions
    .flatMap((action) => action.input?.flatMap((input) => input.profile))
    .filter(notEmpty)
  const filteredCanonicals = canonicals.filter((c) => c != undefined)
  if (filteredCanonicals.length) {
    allCanonicals = [...new Set(allCanonicals.concat(filteredCanonicals))]
  }
  actions.forEach((action) => {
    if (action.action) {
      allCanonicals = allCanonicals.concat(getDataRequirements(action.action))
    }
  })
  return allCanonicals
}

export interface buildModularQuestionnaireArgs {
  planDefinition: fhir4.PlanDefinition
  data?: fhir4.Bundle | undefined
  dataEndpoint?: fhir4.Endpoint | undefined
  artifactEndpointConfigurable?: EndpointConfiguration[] | undefined
  contentEndpoint?: fhir4.Endpoint | undefined
  terminologyEndpoint?: fhir4.Endpoint | undefined
  supportedOnly?: boolean | undefined
}

export const buildModularQuestionnaire = async (
  args: buildModularQuestionnaireArgs
) => {
  const {
    planDefinition,
    data,
    dataEndpoint,
    artifactEndpointConfigurable,
    contentEndpoint,
    terminologyEndpoint,
    supportedOnly
  } = args

  let structureDefinitions: string[] = []
  if (planDefinition?.url) {
    const planDefinitions = (await getNestedPlanDefinitions(
      planDefinition,
      contentEndpoint,
      artifactEndpointConfigurable
    )) || [planDefinition]
    planDefinitions.forEach((p) => {
      if (p.action) {
        structureDefinitions = [
          ...new Set(structureDefinitions.concat(getDataRequirements(p.action)))
        ]
      }
    })
  }

  const questionnaireBundle: fhir4.Bundle = {
    resourceType: 'Bundle',
    id: uuidv4(),
    type: 'collection'
  }

  if (structureDefinitions?.length) {
    const bundleEntries = await Promise.all(
      structureDefinitions
        .map(async (p) => {
          let structureDefinitionRaw
          if (contentEndpoint != null) {
            const resolver = Resolver(contentEndpoint)
            structureDefinitionRaw = await resolver.resolveCanonical(p)
          } else {
            structureDefinitionRaw = await resolveFromConfigurableEndpoints(
              artifactEndpointConfigurable,
              p,
              contentEndpoint
            )
          }
          if (is.StructureDefinition(structureDefinitionRaw)) {
            const questionnaire: fhir4.Questionnaire = await buildQuestionnaire(
              {
                structureDefinition: structureDefinitionRaw,
                data,
                dataEndpoint,
                artifactEndpointConfigurable,
                contentEndpoint,
                terminologyEndpoint,
                supportedOnly
              } as BuildQuestionnaireArgs
            )
            return {
              fullUrl: questionnaire.url,
              resource: questionnaire
            }
          }
        })
        .filter(notEmpty) as fhir4.BundleEntry[]
    )
    questionnaireBundle.entry = bundleEntries
  }

  if (questionnaireBundle.entry?.length) {
    const modularQuestionnaire: fhir4.Questionnaire = {
      id: uuidv4(),
      resourceType: 'Questionnaire',
      description: `Questionnaire generated from ${planDefinition?.url}`,
      status: 'draft',
      extension: [
        {
          url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assemble-expectation',
          valueCode: 'assemble-root'
        }
      ],
      item: []
    }
    modularQuestionnaire.url = `${questionnaireBaseUrl}/Questionnaire/${modularQuestionnaire.id}`
    questionnaireBundle.entry.forEach((e) => {
      if (e.resource && is.Questionnaire(e.resource)) {
        const resource = e.resource as fhir4.Questionnaire
        const subQuestionnaire: fhir4.QuestionnaireItem = {
          linkId: uuidv4(),
          type: 'display',
          text: `Sub-questionnaire - ${resource.url}`,
          extension: [
            {
              url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire',
              valueCanonical: resource.url
            }
          ]
        }
        modularQuestionnaire.item?.push(subQuestionnaire)
      }
    })
    questionnaireBundle.entry.unshift({
      fullUrl: modularQuestionnaire.url,
      resource: modularQuestionnaire
    })
  }
  return questionnaireBundle
}
