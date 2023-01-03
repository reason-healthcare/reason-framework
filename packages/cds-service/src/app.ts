import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from 'fastify'
import CDSHooks from 'smart-typescript-support/types/cds-hooks'
import {
  applyActivityDefinition,
  ApplyActivityDefinitionArgs,
  applyPlanDefinition,
  ApplyPlanDefinitionArgs,
} from '@reason-framework/cpg-execution'
import Resolver from '@reason-framework/cpg-execution/lib/resolver'
import { is, notEmpty } from '@reason-framework/cpg-execution/lib/helpers'

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

const fileEndpoint: fhir4.Endpoint = {
  resourceType: 'Endpoint',
  address:
    'file:///Users/bkaney/projects/reason-framework/packages/cpg-execution/test/fixtures/ExampleIG/output',
  status: 'active',
  payloadType: [
    {
      coding: [
        {
          code: 'content',
        },
      ],
    },
  ],
  connectionType: {
    code: 'hl7-fhir-file',
  },
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

export default (options?: FastifyServerOptions): FastifyInstance => {
  const app = fastify(options)

  app.get('/cds-services', async (req, res): Promise<void> => {
    const resolver = Resolver(fileEndpoint)
    
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
              id: encodeURIComponent(planDefinition.url),
              title: planDefinition.title,
              description: planDefinition.description,
              hook: hookTrigger?.name,
            }
          }
        }
      })
      .filter((service) => service?.hook != null)

    res.send(cdsHooksServices)
  })

  app.post<{
    Params: { serviceCanonical: string }
    Body: CDSHooks.HookRequest
  }>('/cds-services/:serviceCanonical', async (req, res): Promise<void> => {
    const resolver = Resolver(fileEndpoint)
    const { hook, context } = req.body
    const { serviceCanonical } = req.params
    const planDefinition = await resolver.resolveCanonical(serviceCanonical)

    const dataEndpoint = fileEndpoint
    const contentEndpoint = fileEndpoint
    const terminologyEndpoint = fileEndpoint

    if (is.PlanDefinition(planDefinition)) {
      const trigger = planDefinition.action?.[0]?.trigger?.find(
        (t) => t.type === 'named-event'
      )
      if (trigger?.name !== hook) {
        throw new Error(
          `called hook ${hook}, but not a trigger for planDefinition ${serviceCanonical}`
        )
      }

      let subject: string,
        practitioner: string,
        encounter: string | undefined,
        data: fhir4.Bundle = { resourceType: 'Bundle', type: 'collection' }

      if (isPatientViewContext(context, hook)) {
        subject = context.patientId
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
      res.send(await applyPlanDefinition(args))
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
        const contentEndpoint = resourceFromParameters(
          parameters,
          'contentEndpoint'
        ) as fhir4.Endpoint
        const terminologyEndpoint = resourceFromParameters(
          parameters,
          'terminologyEndpoint'
        ) as fhir4.Endpoint

        const args: ApplyActivityDefinitionArgs = {
          activityDefinition,
          subject: valueFromParameters(parameters, 'subject', 'valueReference'),
          practitioner: valueFromParameters(
            parameters,
            'practitioner',
            'valueReference'
          ),
          encounter: valueFromParameters(
            parameters,
            'encounter',
            'valueReference'
          ),
          organization: valueFromParameters(
            parameters,
            'organization',
            'valueReference'
          ),
          data,
          dataEndpoint,
          contentEndpoint,
          terminologyEndpoint,
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
        const planDefinition = resourceFromParameters(
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
        const contentEndpoint = resourceFromParameters(
          parameters,
          'contentEndpoint'
        ) as fhir4.Endpoint
        const terminologyEndpoint = resourceFromParameters(
          parameters,
          'terminologyEndpoint'
        ) as fhir4.Endpoint

        const args: ApplyPlanDefinitionArgs = {
          planDefinition,
          subject: valueFromParameters(parameters, 'subject', 'valueReference'),
          practitioner: valueFromParameters(
            parameters,
            'practitioner',
            'valueReference'
          ),
          encounter: valueFromParameters(
            parameters,
            'encounter',
            'valueReference'
          ),
          organization: valueFromParameters(
            parameters,
            'organization',
            'valueReference'
          ),
          data,
          dataEndpoint,
          contentEndpoint,
          terminologyEndpoint,
        }
        res.send(await applyPlanDefinition(args))
      }
    }
  )
  return app
}
