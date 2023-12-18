import { Resolver } from './resolver'

import {
  applyActivityDefinition,
  ApplyActivityDefinitionArgs
} from './applyActivityDefinition'
import {
  applyPlanDefinition,
  ApplyPlanDefinitionArgs
} from './applyPlanDefinition'
import {
  buildDataContext,
  evaluateFhirpath,
  evaluateCqlExpression,
  processDynamicValue
} from './expression'
import {
  notEmpty,
  is,
  RequestResource,
  referenceFromResource,
  inspect,
  baseUrl
} from './helpers'

const isApplicable = async (
  patientRef: string,
  planDefinitionAction: fhir4.PlanDefinitionAction,
  contentResolver: Resolver,
  terminologyResolver: Resolver,
  dataResolver: Resolver | undefined,
  dataContext: fhir4.Bundle,
  libraries?: fhir4.Library[] | undefined
): Promise<boolean> => {
  const { condition } = planDefinitionAction
  const applicabilityConditions = condition?.filter(
    (c) => c.kind === 'applicability'
  )

  // If there are no conditions, the action is active
  if (
    applicabilityConditions == null ||
    applicabilityConditions?.length === 0
  ) {
    return true
  }

  const applicabilities = await Promise.all(
    applicabilityConditions.flatMap(async (condition) => {
      const { expression } = condition
      if (expression?.expression == null) {
        console.warn('WARN: Expression is blank', expression)
        return null
      } else if (expression?.language === 'text/fhirpath') {
        return evaluateFhirpath(expression?.expression)
      } else if (expression?.language === 'text/cql-identifier') {
        if (
          (libraries == null || libraries.length == 0) &&
          expression.reference == null
        ) {
          console.warn(
            'WARN: There are no libraries defined and the expression does not have a reference to a library. ' +
              'Therefore no logic to run -- Check content this seems like a problem, expression:',
            expression
          )
        }
        return await evaluateCqlExpression(
          patientRef,
          expression,
          dataContext,
          contentResolver,
          terminologyResolver,
          dataResolver,
          libraries
        )
      } else {
        console.warn(
          `WARN: Expression lanugage '${
            expression?.language ?? '[none]'
          }' not supported, only support for: text/fhirpath, text/cql-identifier`
        )
        return null
      }
    })
  )

  if (applicabilities.every((a) => typeof a === 'boolean')) {
    return applicabilities.every((a) => a === true)
  } else {
    console.warn(
      'WARN: Not all applicability results are boolean, this could be a content problem:',
      applicabilities
    )
    return false
  }
}

const isAtomic = (
  planDefinitionAction: fhir4.PlanDefinitionAction
): boolean => {
  return planDefinitionAction?.action == null
}

/**
 * Given a PlanDefinition action, return a requestgroup action, if applicable.
 *
 * NOTE: This implements the new R5 proposal for PlanDefinition $apply
 *
 * - Determine applicability by evaluating the applicability conditions defined
 *   for the element
 * - If the action is applicable, determine whether the action
 *   is a group or a single, atomic activity (does the action have child actions?)
 *   - if the action is atomic, process according to the following steps:
 *     1. Create an action element in the RequestGroup with the same id as the
 *        action being processed
 *     2. Apply the elements of the action to the corresponding elements of the
 *        newly created action in the RequestGroup such as title, description,
 *        textEquivalent, timing, and so on
 *     3. Carry any start and stop conditions defined in the plan action forward
 *        to the request group action (XXX: is this relatedAction?)
 *     4. There are three possibilities for the definition element:
 *       a. ActivityDefinition
 *       b. PlanDefinition
 *       c. Questionnaire
 *   - else if the action is a group, determine which actions to process based on
 *     the behaviors specified in the group. Note that this aspect of the process
 *     may require input from a user. In these cases, either the choices made by the
 *     user can be provided as input to the process, or the process can be performed
 *     as part of a user-entry workflow that enables user input to be provided as
 *     necessary.
 *
 * @param action PlanDefinition Action
 * @param args arguments from $apply
 * @returns RequestGroup Action or null
 */
export const applyPlanDefinitionAction = async (
  action: fhir4.PlanDefinitionAction,
  planDefinition: fhir4.PlanDefinition,
  args: ApplyPlanDefinitionArgs,
  contentResolver: Resolver,
  terminologyResolver: Resolver,
  dataResolver?: Resolver | undefined,
  resourceBundle: fhir4.Bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: []
  },
  libraries?: fhir4.Library[] | undefined
): Promise<
  | {
      action: fhir4.RequestGroupAction
      resourceBundle: fhir4.Bundle | undefined
    }
  | undefined
> => {
  const { data, subject, encounter, practitioner, organization } = args

  const dataContext = await buildDataContext(
    dataResolver,
    data,
    subject,
    encounter,
    practitioner,
    organization
  )
  if (
    !(await isApplicable(
      subject,
      action,
      contentResolver,
      terminologyResolver,
      dataResolver,
      dataContext,
      libraries
    ))
  ) {
    return undefined
  }

  // Straight assignments...
  // XXX: What do we do with participant?
  const {
    id,
    prefix,
    title,
    description,
    priority,
    relatedAction,
    documentation,
    code,
    textEquivalent,
    condition,
    timingAge,
    timingDateTime,
    timingDuration,
    timingPeriod,
    timingRange,
    timingTiming,
    type,
    groupingBehavior,
    selectionBehavior,
    requiredBehavior,
    precheckBehavior,
    cardinalityBehavior,
    definitionCanonical,
    definitionUri,
    dynamicValue
  } = action

  const requestGroupAction: fhir4.RequestGroupAction = {
    id,
    prefix,
    title,
    description,
    priority,
    relatedAction,
    documentation,
    code,
    textEquivalent,
    type,
    groupingBehavior,
    selectionBehavior,
    requiredBehavior,
    precheckBehavior,
    cardinalityBehavior
  }

  // Priority
  if (priority != null) {
    requestGroupAction.priority = priority
  }

  // Condition
  if (condition != null) {
    requestGroupAction.condition = condition
  }

  // Documentation
  if (documentation != null) {
    requestGroupAction.documentation = documentation
  }

  // Timing
  if (timingAge != null) {
    requestGroupAction.timingAge = timingAge
  } else if (timingDuration != null) {
    requestGroupAction.timingDuration = timingDuration
  } else if (timingDateTime != null) {
    requestGroupAction.timingDateTime = timingDateTime
  } else if (timingPeriod != null) {
    requestGroupAction.timingPeriod = timingPeriod
  } else if (timingRange != null) {
    requestGroupAction.timingRange = timingRange
  } else if (timingTiming != null) {
    requestGroupAction.timingTiming = timingTiming
  }

  // DefinitionCanonical...
  if (definitionCanonical != null) {
    const definitionResource = await contentResolver.resolveCanonical(
      definitionCanonical,
      ['ActivityDefinition', 'PlanDefinition', 'Questionnaire']
    )

    let appliedResource: RequestResource | fhir4.Questionnaire | undefined
    let appliedBundle: fhir4.Bundle | undefined

    if (is.ActivityDefinition(definitionResource)) {
      const activityDefinitionArgs: ApplyActivityDefinitionArgs = {
        ...args,
        activityDefinition: definitionResource
      }

      appliedResource = await applyActivityDefinition(activityDefinitionArgs)

      if (is.RequestResource(appliedResource)) {
        if (is.RequestResourceWithIntent(appliedResource)) {
          appliedResource.intent = 'proposal'
        }

        requestGroupAction.type = {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/action-type',
              code: 'create'
            }
          ]
        }
      }

      // Apply any dynamicValues from the PD now
      let newAppliedResources: (
        | RequestResource
        | fhir4.Questionnaire
        | undefined
      )[] = []

      if (
        (is.RequestResource(appliedResource) ||
          is.Questionnaire(appliedResource)) &&
        dynamicValue
      ) {
        newAppliedResources = await Promise.all(
          dynamicValue.map(async (dv) => {
            return await processDynamicValue(
              dv,
              planDefinition,
              appliedResource as RequestResource | fhir4.Questionnaire, // XXX: Why is this needed?
              contentResolver,
              terminologyResolver,
              dataResolver,
              data,
              libraries,
              subject,
              encounter,
              practitioner,
              organization
            )
          })
        )

        newAppliedResources
          .filter((r) => is.RequestResource(r) || is.Questionnaire(r))
          .forEach((resource) =>
            Object.assign(
              (appliedResource: RequestResource | fhir4.Questionnaire) =>
                appliedResource,
              resource
            )
          ) //callback fn to declare types? Otherwise erroring bc of type 'undefined'
      }
    } else if (is.PlanDefinition(definitionResource)) {
      const planDefinitionArgs: ApplyPlanDefinitionArgs = {
        ...args,
        planDefinition: definitionResource
      }

      appliedBundle = await applyPlanDefinition(
        planDefinitionArgs,
        resourceBundle
      )

      const subRequestGroup = appliedBundle?.entry?.shift()
      if (is.RequestGroup(subRequestGroup?.resource)) {
        // if (
        //   subRequestGroup?.resource?.action?.every((a) => a.resource != null)  //do we need this? Not every subRequestGroups needs an action.resource because not all sub groups will have an action definition
        // ) {
        //   appliedResource = subRequestGroup?.resource
        //   console.log("appliedR" + JSON.stringify(appliedResource))
        // }
        if (subRequestGroup?.resource) {
          subRequestGroup.resource.intent = 'option'
          appliedResource = subRequestGroup.resource
        }
      } else {
        throw new Error(
          'Problem processing sub PlanDefinition, missing requestGroup.' +
            inspect(subRequestGroup)
        )
      }
    } else if (is.Questionnaire(definitionResource)) {
      requestGroupAction.resource = referenceFromResource(definitionResource)
    } else {
      console.warn(
        'Support for only ActivityDefinition, PlanDefinition, and Questionnaire. No support for: %j',
        definitionResource
      )
    }

    if (appliedResource != null) {
      ;(resourceBundle.entry ||= []).push({
        fullUrl: `${baseUrl}/${appliedResource.resourceType}/${appliedResource.id}`,
        resource: appliedResource
      })

      requestGroupAction.resource = referenceFromResource(appliedResource)
    }
  }

  // XXX: What is the behavior here?
  if (definitionUri != null) {
    console.warn('Support for definitionUri is pending.')
  }

  // Process any children...
  if (!isAtomic(action) && action.action != null) {
    const childActionBundlesRaw = await Promise.all(
      action.action.map(
        async (a) =>
          await applyPlanDefinitionAction(
            a,
            planDefinition,
            args,
            contentResolver,
            terminologyResolver,
            dataResolver,
            resourceBundle,
            libraries
          )
      )
    )

    const childActionBundles = childActionBundlesRaw.filter(notEmpty)

    requestGroupAction.action = childActionBundles?.map(
      (childActionBundle) => childActionBundle.action
    )
  }

  // Return the action and resourceBundle
  if (requestGroupAction != null) {
    return {
      action: requestGroupAction,
      resourceBundle
    }
  }
}
