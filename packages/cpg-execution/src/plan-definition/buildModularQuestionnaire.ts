import {
  buildQuestionnaire,
  BuildQuestionnaireArgs,
  EndpointConfiguration
} from '../structure-definition/buildQuestionnaire'
import {
  inspect,
  is,
  notEmpty,
  questionnaireBaseUrl,
  resolveFromConfigurableEndpoints
} from '../helpers'
import Resolver from '../resolver'
import { v4 as uuidv4 } from 'uuid'
import { SDC_QUESTIONNAIRE_SUB_QUESTIONNAIRE } from '../constants'
import { assembleQuestionnaire } from '../questionnaire/assembleQuestionnaire'

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
  // For each action, find input and add to list of profiles
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
  artifactEndpointConfigurable?: EndpointConfiguration[] | undefined
  contentEndpoint?: fhir4.Endpoint | undefined
  terminologyEndpoint?: fhir4.Endpoint | undefined
  supportedOnly?: boolean | undefined
  minimalOnly?: boolean | undefined
}

export const buildModularQuestionnaire = async (
  args: buildModularQuestionnaireArgs
) => {
  const {
    planDefinition,
    artifactEndpointConfigurable,
    contentEndpoint,
    terminologyEndpoint,
    supportedOnly,
    minimalOnly
  } = args

  if (!is.PlanDefinition(planDefinition)) {
    throw new Error(
      `planDefinition does not seem to be a FHIR PlanDefinition" ${inspect(
        planDefinition
      )}`
    )
  }

  const modularQuestionnaire = {
    id: uuidv4(),
    resourceType: 'Questionnaire',
    description: `Questionnaire generated from ${planDefinition?.url}`,
    status: 'draft',
    extension: [
      {
        url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assemble-expectation',
        valueCode: 'assemble-root'
      }
    ]
  } as fhir4.Questionnaire
  modularQuestionnaire.url = `${questionnaireBaseUrl}/Questionnaire/${modularQuestionnaire.id}`

  let profiles: string[] = []
  if (planDefinition?.url) {
    const planDefinitions = (await getNestedPlanDefinitions(
      planDefinition,
      contentEndpoint,
      artifactEndpointConfigurable
    )) || [planDefinition]
    planDefinitions.forEach((p) => {
      if (p.action) {
        profiles = [...new Set(profiles.concat(getDataRequirements(p.action)))]
      }
    })
  }

  let items
  if (profiles?.length) {
    items = await Promise.all(
      profiles
        .map(async (p) => {
          const item = {
            linkId: uuidv4(),
            type: 'display'
          } as fhir4.QuestionnaireItem
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
                artifactEndpointConfigurable,
                contentEndpoint,
                terminologyEndpoint,
                supportedOnly,
                minimalOnly
              } as BuildQuestionnaireArgs
            )
            if (is.Questionnaire(questionnaire)) {
              item.text = `Sub-questionnaire - ${questionnaire.url}`
              item.extension = [
                {
                  url: SDC_QUESTIONNAIRE_SUB_QUESTIONNAIRE,
                  valueCanonical: questionnaire.url
                }
              ]
              ;(modularQuestionnaire.contained ||= []).push(questionnaire)
            } else {
              item.text = `Error: Problem generation questionnaire from structure definition ${p}. Does not seem to be a FHIR Questionnaire`
            }
          } else {
            item.text = `Error: Problem generation questionnaire from structure definition ${p}. Does not seem to be a FHIR StructureDefinition`
          }
          return item
        })
        .filter(notEmpty)
    )
  }

  if (items != null && items.length) {
    modularQuestionnaire.item = items
  }

  const assembledQuestionnaire = await assembleQuestionnaire({
    questionnaire: modularQuestionnaire,
    artifactEndpointConfigurable,
    contentEndpoint
  })

  return assembledQuestionnaire
}
