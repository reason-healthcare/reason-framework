import Fastify, {
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from 'fastify'
import cors from '@fastify/cors'
import CDSHooks from 'smart-typescript-support/types/cds-hooks'
import {
  applyActivityDefinition,
  ApplyActivityDefinitionArgs,
  applyPlanDefinition,
  ApplyPlanDefinitionArgs,
  buildQuestionnaire,
  BuildQuestionnaireArgs,
  EndpointConfiguration,
} from '@reason-framework/cpg-execution'
import Resolver from '@reason-framework/cpg-execution/lib/resolver'
import { is, notEmpty } from '@reason-framework/cpg-execution/lib/helpers'
import { removeUndefinedProps } from '@reason-framework/cpg-execution/lib/helpers'
import { v4 as uuidv4 } from "uuid"
import { rankEndpoints } from '@reason-framework/cpg-execution/lib/helpers'

/**
 * The patient whose record was opened, including their encounter, if
 * applicable.
 *
 * The user has just opened a patient's record; typically called only once at
 * the beginning of a user's interaction with a specific patient's record.
 */
interface PatientViewHookContext {
  /**
   * The id of the current user.
   * For this hook, the user is expected to be of type Practitioner or
   * PractitionerRole.  For example, PractitionerRole/123 or Practitioner/abc.
   */
  userId: string

  /**
   * The FHIR Patient.id of the current patient in context
   */
  patientId: string

  /**
   * The FHIR Encounter.id of the current encounter in context
   */
  encounterId?: string | undefined
}

interface OrderSelectHookContext extends OrderSignHookContext {
  /**
   * The FHIR id of the newly selected order(s).
   * The selections field references FHIR resources in the draftOrders Bundle. For
   * example, MedicationRequest/103.
   */
  selections: string[]
}

/**
 * The order-sign hook fires when a clinician is ready to sign one or more
 * orders for a patient, (including orders for medications, procedures, labs and
 * other orders).
 *
 * This hook is among the last workflow events before an order is promoted out
 * of a draft status. The context contains all order details, such as dose,
 * quantity, route, etc, although the order has not yet been signed and
 * therefore still exists in a draft status. Use this hook when your service
 * requires all order details, and the clinician will accept recommended
 * changes.
 */
interface OrderSignHookContext extends PatientViewHookContext {
  /**
   * R4 - FHIR Bundle of DeviceRequest, MedicationRequest, NutritionOrder,
   * ServiceRequest, VisionPrescription with draft status
   */
  draftOrders: fhir4.Bundle
}

const valueFromParameters = (
  parameters: fhir4.ParametersParameter[],
  name: string,
  type: string
) => {
  const parameterItem = parameters.find(
    (parameterItem) => parameterItem.name === name
  )
  if (parameterItem != null) {
    return (parameterItem as any)[type]
  }
}

const resourceFromParameters = (
  parameters: fhir4.ParametersParameter[],
  name: string
): fhir4.FhirResource | undefined => {
  return parameters.find((parameterItem) => parameterItem.name === name)
    ?.resource
}

const createEndpoint = (endpointAddress: string | undefined, payloadTypeCode: string): fhir4.Endpoint => {
  const connectionTypeCode = endpointAddress?.startsWith('http')
  ? 'hl7-fhir-rest'
  : endpointAddress?.startsWith('file')
  ? 'hl7-fhir-file'
  : 'unknown'

  return {
    resourceType: 'Endpoint',
    address: endpointAddress || 'unknown',
    status: 'active',
    payloadType: [
      {
        coding: [
          {
            code: payloadTypeCode,
          },
        ],
      },
    ],
    connectionType: {
      code: connectionTypeCode,
    },
  }
}

const defaultEndpoint = createEndpoint(process.env.ENDPOINT_ADDRESS, 'all')

const endpointConfigurationFromParameters = (
  parameters: fhir4.ParametersParameter[]
): EndpointConfiguration[] | undefined => {
  const endpoints = parameters.filter(p => p.name === "artifactEndpointConfiguration")?.map(p => {
    let artifactRoute = p.part?.find(p => p.name === "artifactRoute")?.valueUri
    let endpoint = p.part?.find(p => p.name === "endpoint")?.resource || createEndpoint(p.part?.find(p => p.name === "endpointUri")?.valueUri, 'content')
    if (endpoint !== null && artifactRoute !== null) {
      return {
        artifactRoute,
        endpoint
      } as EndpointConfiguration
    }
  }).filter(notEmpty)
  if (!endpoints.length) {
    return undefined
  }
  return endpoints
}

const isPatientViewContext = (
  context: any,
  hook: string
): context is PatientViewHookContext => {
  return (
    hook === 'patient-view' &&
    context.userId != null &&
    context.patientId != null
  )
}

const isOrderSelectContext = (
  context: any,
  hook: string
): context is OrderSelectHookContext => {
  return (
    hook === 'order-select' &&
    context.userId != null &&
    context.patientId != null &&
    Array.isArray(context.selections) &&
    context.selections.length > 0 &&
    is.Bundle(context.draftOrders)
  )
}

const isOrderSignContext = (
  context: any,
  hook: string
): context is OrderSignHookContext => {
  return (
    hook === 'order-sign' &&
    context.userId != null &&
    context.patientId != null &&
    is.Bundle(context.draftOrders)
  )
}

export default async (options?: FastifyServerOptions) => {
  const app = Fastify(options)

  await app.register(cors, {
    origin: '*',
    allowedHeaders: ['*'],
    methods: ['*'],
  })

  app.get('/health', (_req, res) => {
    console.log('Called /health')
    res.send({ health: 'ok' })
  })

  app.get('/cds-services', async (req, res): Promise<void> => {
    const resolver = Resolver(defaultEndpoint)

    const planDefinitions = (
      await resolver.allByResourceType('PlanDefinition')
    )?.filter(is.PlanDefinition)

    const cdsHooksServices = planDefinitions
      ?.map((planDefinition) => {
        if (is.PlanDefinition(planDefinition)) {
          const hookTrigger = planDefinition.action?.[0]?.trigger?.find(
            (t) => t.type === 'named-event'
          )
          if (planDefinition.url != null) {
            return {
              id: planDefinition.id,
              title: planDefinition.title,
              description: planDefinition.description,
              hook: hookTrigger?.name,
            }
          }
        }
      })
      .filter((service) => service?.hook != null)

    res.send({ services: cdsHooksServices })
  })

  // As $apply builds a hierarchy of nested requeste groups, first flatten to a
  // single action tree, then apply the rules on clinical-reasoning-on-fhir

  app.post<{
    Params: { id: string }
    Body: CDSHooks.HookRequestWithFhir
  }>('/cds-services/:id', async (req, res): Promise<void> => {
    const resolver = Resolver(defaultEndpoint)
    const { hook, context, fhirServer } = req.body
    const { id } = req.params
    const planDefinition = await resolver.resolveReference(
      `PlanDefinition/${id}`
    )

    const dataEndpoint = JSON.parse(JSON.stringify(defaultEndpoint))
    if (fhirServer != null) {
      dataEndpoint.address = fhirServer
      if (fhirServer.startsWith('http')) {
        dataEndpoint.connectionType.code = 'hl7-fhir-rest'
      } else {
        dataEndpoint.connectionType.code = 'hl7-fhir-file'
      }
    }

    const contentEndpoint = defaultEndpoint
    const terminologyEndpoint = defaultEndpoint

    if (is.PlanDefinition(planDefinition)) {
      const trigger = planDefinition.action?.[0]?.trigger?.find(
        (t) => t.type === 'named-event'
      )
      if (trigger?.name !== hook) {
        throw new Error(
          `called hook ${hook}, but not a trigger for planDefinition ${id}`
        )
      }

      let subject: string,
        practitioner: string,
        encounter: string | undefined,
        data: fhir4.Bundle = { resourceType: 'Bundle', type: 'collection' }

      if (isPatientViewContext(context, hook)) {
        subject = `Patient/${context.patientId}`
        practitioner = context.userId
        encounter = context.encounterId
      } else if (isOrderSelectContext(context, hook)) {
        subject = context.patientId
        practitioner = context.userId
        encounter = context.encounterId

        const selectedDraftOrders = context.draftOrders.entry
          ?.map((e) => e.resource)
          ?.filter(notEmpty)
          ?.filter((e) => e.id && context.selections.includes(e.id))

        const entry = selectedDraftOrders?.map((o) => {
          return { resource: o }
        })
        data = {
          resourceType: 'Bundle',
          type: 'collection',
          entry,
        }
      } else if (isOrderSignContext(context, hook)) {
        subject = context.patientId
        practitioner = context.userId
        encounter = context.encounterId
        data = context.draftOrders
      } else {
        throw new Error(
          `Only support for well-formed patient-view, order-select, and order-sign hooks` +
            `, got: hook ${hook}, context ${JSON.stringify(context, null, 2)}`
        )
      }

      const args: ApplyPlanDefinitionArgs = {
        planDefinition,
        dataEndpoint,
        contentEndpoint,
        terminologyEndpoint,
        subject,
        encounter,
        practitioner,
        data,
      }

      if (process.env.DEBUG != null) {
        console.info(args)
      }

      let result
      try {
        result = await applyPlanDefinition(args)

        if (is.Bundle(result)) {
          const [requestGroup, ...others] =
            result.entry?.map((e) => e.resource).filter(is.FhirResource) ?? []

          let cards: CDSHooks.Card[] = []

          if (is.RequestGroup(requestGroup)) {
            const processAction = (
              requestGroupAction: fhir4.RequestGroupAction,
              bundle: fhir4.Bundle
            ) => {
              const processedAction = requestGroupAction
              const { resource, action } = requestGroupAction
              if (resource) {
                const resolvedResource = bundle.entry?.find((e) => {
                  if (e.fullUrl && resource.reference) {
                    return e.fullUrl.endsWith(resource.reference)
                  } else {
                    return false
                  }
                })?.resource

                if (is.RequestGroup(resolvedResource)) {
                  delete requestGroupAction.resource
                  const subRequestGroupAction = flatRequestGroup(
                    resolvedResource,
                    bundle
                  )
                  if (subRequestGroupAction != null) {
                    processedAction.action = subRequestGroupAction
                  }
                }
              } else if (action) {
                const a = action.map((a) => processAction(a, bundle))
                if (a != null) {
                  requestGroupAction.action = a
                }
              }
              return removeUndefinedProps(processedAction)
            }

            const flatRequestGroup = (
              requestGroup: fhir4.RequestGroup,
              bundle: fhir4.Bundle
            ): fhir4.RequestGroupAction[] | undefined => {
              const { action } = requestGroup
              if (action) {
                return action.map((a) => processAction(a, bundle))
              }
            }
            const flattenedRequestGroup = flatRequestGroup(requestGroup, result)

            const tmpCards =
              flattenedRequestGroup
                ?.map((action, index) => {
                  // Add indicator
                  const priority =
                    action.priority || requestGroup.priority || 'routine'
                  const indicatorByPriority = {
                    routine: 'info',
                    urgent: 'warning',
                    asap: 'critical',
                    stat: 'critical',
                  }
                  const indicator =
                    indicatorByPriority[priority] === 'routine'
                      ? ('info' as const)
                      : indicatorByPriority[priority] === 'urgent'
                      ? ('warning' as const)
                      : indicatorByPriority[priority] === 'stat' ||
                        indicatorByPriority[priority] === 'asap'
                      ? ('critical' as const)
                      : ('info' as const)

                  // Add source
                  let source: CDSHooks.Source = { label: 'Placeholder Label' }
                  const relatedArtifact = action.documentation?.find(
                    (d) => d.type === 'documentation'
                  )
                  if (relatedArtifact != null) {
                    source = {
                      label: relatedArtifact.label ?? 'Placeholder Label',
                      url: relatedArtifact.url ?? '',
                    }
                  }

                  let suggestions: CDSHooks.Suggestion[] = []
                  if (action.action != null) {
                    suggestions = action.action
                      .map((suggestionAction, subIndex) => {
                        let actions: CDSHooks.SystemAction[] = []
                        if (suggestionAction.action != null) {
                          actions =
                            suggestionAction.action
                              ?.map((targetAction) => {
                                const targetResource = others.find((o) =>
                                  targetAction?.resource?.reference?.endsWith(
                                    o.id ?? ''
                                  )
                                )
                                return {
                                  type: targetAction.type?.coding?.[0]?.code,
                                  description: targetAction.description,
                                  resource: targetResource,
                                } as CDSHooks.SystemAction
                              })
                              .filter(notEmpty) ?? []
                        }

                        return {
                          label: suggestionAction.title ?? 'label',
                          uuid: `${requestGroup.id}-${index}-${subIndex}`,
                          actions,
                        }
                      })
                      .filter(notEmpty)
                  }

                  // Return CDS Hook Card
                  if (suggestions.length > 0) {
                    return {
                      summary: action.title ?? 'Unknown Title',
                      detail: action.description,
                      indicator,
                      source,
                      suggestions,
                    }
                  }
                })
                .filter(notEmpty) ?? []
            cards.push(...tmpCards.filter((c) => c != null))
          }
          const response: CDSHooks.HookResponse = { cards }
          res.send(response)
        }
      } catch (e) {
        throw e
      }
    }
  })

  app.post(
    '/ActivityDefinition/$apply',
    async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
      const { parameter: parameters } = req.body as fhir4.Parameters

      if (parameters != null) {
        const activityDefinition = resourceFromParameters(
          parameters,
          'activityDefinition'
        ) as fhir4.ActivityDefinition
        const data = resourceFromParameters(parameters, 'data') as
          | fhir4.Bundle
          | undefined
        const dataEndpoint = resourceFromParameters(
          parameters,
          'dataEndpoint'
        ) as fhir4.Endpoint | undefined
        const contentEndpoint =
          (resourceFromParameters(
            parameters,
            'contentEndpoint'
          ) as fhir4.Endpoint) ?? defaultEndpoint
        const terminologyEndpoint =
          (resourceFromParameters(
            parameters,
            'terminologyEndpoint'
          ) as fhir4.Endpoint) ?? defaultEndpoint

        const args: ApplyActivityDefinitionArgs = {
          activityDefinition,
          subject: valueFromParameters(parameters, 'subject', 'valueString'),
          practitioner: valueFromParameters(
            parameters,
            'practitioner',
            'valueString'
          ),
          encounter: valueFromParameters(
            parameters,
            'encounter',
            'valueString'
          ),
          organization: valueFromParameters(
            parameters,
            'organization',
            'valueString'
          ),
          data,
          dataEndpoint,
          contentEndpoint,
          terminologyEndpoint,
        }

        if (process.env.DEBUG != null) {
          console.info(args)
        }

        res.send(await applyActivityDefinition(args))
      }
    }
  )

  app.post(
    '/PlanDefinition/$apply',
    async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
      const { parameter: parameters } = req.body as fhir4.Parameters

      if (parameters != null) {
        let planDefinition = resourceFromParameters(
          parameters,
          'planDefinition'
        ) as fhir4.PlanDefinition

        const data = resourceFromParameters(parameters, 'data') as
          | fhir4.Bundle
          | undefined
        const dataEndpoint = resourceFromParameters(
          parameters,
          'dataEndpoint'
        ) as fhir4.Endpoint | undefined
        const contentEndpoint =
          (resourceFromParameters(
            parameters,
            'contentEndpoint'
          ) as fhir4.Endpoint) ?? defaultEndpoint
        const terminologyEndpoint =
          (resourceFromParameters(
            parameters,
            'terminologyEndpoint'
          ) as fhir4.Endpoint) ?? defaultEndpoint
        if (planDefinition == null) {
          let url = valueFromParameters(parameters, 'url', 'valueString')
          const contentResolver = Resolver(contentEndpoint)
          const planDefinitionRaw = await contentResolver.resolveCanonical(url)

          if (is.PlanDefinition(planDefinitionRaw)) {
            planDefinition = planDefinitionRaw
          }
        }

        const args: ApplyPlanDefinitionArgs = {
          planDefinition,
          subject: valueFromParameters(parameters, 'subject', 'valueString'),
          practitioner: valueFromParameters(
            parameters,
            'practitioner',
            'valueString'
          ),
          encounter: valueFromParameters(
            parameters,
            'encounter',
            'valueString'
          ),
          organization: valueFromParameters(
            parameters,
            'organization',
            'valueString'
          ),
          data,
          dataEndpoint,
          contentEndpoint,
          terminologyEndpoint,
        }

        if (process.env.DEBUG != null) {
          console.info(args)
        }

        res.send(await applyPlanDefinition(args))
      }
    }
  )

  app.post(
    '/StructureDefinition/$questionnaire',
    async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
      const { parameter: parameters } = req.body as fhir4.Parameters

      if (parameters != null) {

        const data = resourceFromParameters(parameters, 'data')  as fhir4.Bundle | undefined
        const supportedOnly = valueFromParameters(parameters, 'supportedOnly', 'valueBoolean')
        const dataEndpoint = resourceFromParameters(
          parameters,
          'dataEndpoint'
        ) as fhir4.Endpoint | undefined
        const terminologyEndpoint =
          (resourceFromParameters(
            parameters,
            'terminologyEndpoint'
          ) as fhir4.Endpoint) ?? defaultEndpoint
        const configurableEndpoints = endpointConfigurationFromParameters(
          parameters,
        ) as EndpointConfiguration[] | undefined
        const contentEndpoint =
          (resourceFromParameters(
            parameters,
            'terminologyEndpoint'
          ) as fhir4.Endpoint) ?? defaultEndpoint

        if (!contentEndpoint && !configurableEndpoints) {
          console.warn('Need to specify either a content endpoint or configurable content endpoints')
        }

        // use profile as SD if provided
        let structureDefinition
        structureDefinition = resourceFromParameters(
          parameters,
          'profile'
        )

        // if profile not provided, use Canonical -- should we also support identifier and slug (URL: [base]/StructureDefinition/[id]/$questionnaire)?
        if (structureDefinition == null) {
          let structureDefinitionRaw
          let url = valueFromParameters(parameters, 'url', 'valueUri')
          if (configurableEndpoints && url) {
            const endpoints = rankEndpoints(configurableEndpoints, url)
            for (let i = 0; i < endpoints.length; i++) {
              const resolver = Resolver(endpoints[i].endpoint)
              try {
                structureDefinitionRaw = await resolver.resolveCanonical(url)
                if (structureDefinitionRaw) {
                  break
                }
              } catch (e) {
                console.log(e)
              }
            }
          } else if (contentEndpoint) {
            const resolver = Resolver(contentEndpoint)
            structureDefinitionRaw = await resolver?.resolveCanonical(url)
          }
          if (is.StructureDefinition(structureDefinitionRaw)) {
            structureDefinition = structureDefinitionRaw
            const args: BuildQuestionnaireArgs = {
              structureDefinition,
              data,
              dataEndpoint,
              configurableEndpoints,
              contentEndpoint,
              terminologyEndpoint,
              supportedOnly
            }
            res.send(await buildQuestionnaire(args))
          } else {
            console.warn("Must provide a structure definition")
          }
        }
      }
    }
  )

  app.post(
    '/PlanDefinition/$questionnaire',
    async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
      const { parameter: parameters } = req.body as fhir4.Parameters
      // Use resource as PD if provided
      if (parameters != null) {
        const data = resourceFromParameters(parameters, 'data')  as fhir4.Bundle | undefined
        const supportedOnly = valueFromParameters(parameters, 'supportedOnly', 'valueBoolean')
        const dataEndpoint = resourceFromParameters(
          parameters,
          'dataEndpoint'
        ) as fhir4.Endpoint | undefined
        const terminologyEndpoint =
          (resourceFromParameters(
            parameters,
            'terminologyEndpoint'
          ) as fhir4.Endpoint) ?? defaultEndpoint
        const configurableEndpoints = endpointConfigurationFromParameters(
          parameters,
        ) as EndpointConfiguration[] | undefined
        const contentEndpoint =
          (resourceFromParameters(
            parameters,
            'terminologyEndpoint'
          ) as fhir4.Endpoint) ?? defaultEndpoint

        if (!contentEndpoint && !configurableEndpoints) {
          console.warn('Need to specify either a content endpoint or configurable content endpoints')
        }

        let planDefinition = resourceFromParameters(
          parameters,
          'profile'
        ) as fhir4.PlanDefinition

        // If resource not provided, use Canonical
        if (planDefinition == null) {
          let url = valueFromParameters(parameters, 'url', 'valueUri')
          let planDefinitionRaw
            if (configurableEndpoints) {
              const endpoints = rankEndpoints(configurableEndpoints, url)
              for (let i = 0; i < endpoints.length; i++) {
                const resolver = Resolver(endpoints[i].endpoint)
                try {
                  planDefinitionRaw = await resolver.resolveCanonical(url)
                  if (planDefinitionRaw) {
                    break
                  }
                } catch (e) {
                  console.log(e)
                }
              }
            } else if (contentEndpoint) {
              const resolver = Resolver(contentEndpoint)
              planDefinitionRaw = await resolver.resolveCanonical(url)
            }
          if (is.PlanDefinition(planDefinitionRaw)) {
            planDefinition = planDefinitionRaw
          }
        }

        const QuestionnaireBundle : fhir4.Bundle = {
          "resourceType": "Bundle",
          "id": uuidv4(),
          "type": "collection",
        }

        // Resolve all SDs from PD action.inputs
        let profiles : string[] | undefined
        planDefinition?.action?.forEach((a : fhir4.PlanDefinitionAction) => {
          a.input?.forEach(i => {
            i.profile?.forEach(profile => {
              profiles && profiles.length ? profiles.push(profile) : profiles = [profile]
            })
          })
        })

        if (profiles) {
          let structureDefinition: fhir4.StructureDefinition
          const bundleEntries = await Promise.all(profiles.map(async (p) => {
            let structureDefinitionRaw
            if (configurableEndpoints) {
              const endpoints = rankEndpoints(configurableEndpoints, p)
              for (let i = 0; i < endpoints.length; i++) {
                const resolver = Resolver(endpoints[i].endpoint)
                try {
                  structureDefinitionRaw = await resolver.resolveCanonical(p)
                  if (structureDefinitionRaw) {
                    break
                  }
                } catch (e) {
                  console.log(e)
                }
              }
            } else if (contentEndpoint) {
              const resolver = Resolver(contentEndpoint)
              structureDefinitionRaw = await resolver?.resolveCanonical(p)
            }
            if (is.StructureDefinition(structureDefinitionRaw)) {
              structureDefinition = structureDefinitionRaw
            }
            const questionnaire : fhir4.Questionnaire = await buildQuestionnaire({
              structureDefinition,
              data,
              dataEndpoint,
              configurableEndpoints,
              contentEndpoint,
              terminologyEndpoint,
              supportedOnly,
            } as BuildQuestionnaireArgs)
            return {
              "fullUrl": questionnaire.url,
              "resource": questionnaire
            }
          }))
          QuestionnaireBundle.entry = bundleEntries
        }
        res.send(QuestionnaireBundle)
      }
    }
  )
  return app
}
