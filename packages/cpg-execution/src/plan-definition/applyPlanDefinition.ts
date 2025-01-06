import { v4 as uuidv4 } from 'uuid'
import { applyPlanDefinitionAction } from './applyPlanDefinitionAction'
import {
  baseUrl,
  canonicalize,
  inspect,
  is,
  notEmpty,
  referenceFromResource,
  referenceFromString,
  removeUndefinedProps
} from '../helpers'
import Resolver from '../resolver'

/**
 * Based on [Apply Operation](https://hl7.org/fhir/uv/cpg/OperationDefinition-cpg-plandefinition-apply.html)
 *
 * This implementation assumes requestGroupsOnly
 *
 * TODO:
 * - support dynamic questionnaire feature
 *
 * TODO (later):
 * - allow subject to be an array of references
 * - implement userType, userLanguage, userTaskContext
 * - implement setting, and settingContext
 * - implement parameters
 * - support prefetch (right now put everything in `data` Bundle)
 */
export interface ApplyPlanDefinitionArgs {
  planDefinition: fhir4.PlanDefinition
  subject: string
  encounter?: string | undefined
  practitioner?: string | undefined
  organization?: string | undefined
  userType?: fhir4.CodeableConcept | undefined
  setting?: fhir4.CodeableConcept | undefined
  settingContext?: fhir4.CodeableConcept | undefined
  parameters?: fhir4.Parameters | undefined
  data?: fhir4.Bundle | undefined
  contentEndpoint: fhir4.Endpoint | undefined
  terminologyEndpoint: fhir4.Endpoint | undefined
  dataEndpoint?: fhir4.Endpoint | undefined
}

/**
 * Apply a PlanDefinition
 *
 * The original [Applying a
 * PlanDefinition](https://www.hl7.org/fhir/plandefinition.html#12.18.3.3) is
 * used as a guide. This implementation varies in that is does not support building
 * the nexted structure using CarePlan. Additionally, the output of the
 * operation creates a bundle where the first resource is the "primary"
 * RequestGroup, with subsequent resources created along the way.
 *
 * 1. Create a RequestGroup resource focused on the Patient in context and
 *    linked to the PlanDefinition using the instantiates element
 * 2. Create goal elements in the RequestGroup based on the goal definitions in
 *    the plan using resource-pertainsToGoal
 *    (https://www.hl7.org/fhir/extension-resource-pertainstogoal.html)
 * 3. Process each action element of the PlanDefinition
 * 4. Create a Bundle with the first entry the primary request group.
 *
 * @param args Apply Operation arguments
 * @returns results in a FHIR Bundle
 */
export const applyPlanDefinition = async (
  args: ApplyPlanDefinitionArgs,
  resourceBundle: fhir4.Bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: []
  }
): Promise<fhir4.Bundle> => {
  if (resourceBundle.entry == null) {
    resourceBundle.entry = []
  }

  const {
    planDefinition,
    subject,
    practitioner: author,
    organization,
    encounter,
    data,
    dataEndpoint,
    contentEndpoint,
    terminologyEndpoint
  } = args

  if (!is.PlanDefinition(planDefinition)) {
    throw new Error(
      `planDefinition does not seem to be a FHIR PlanDefinition" ${inspect(
        planDefinition
      )}`
    )
  }

  if (data == null && dataEndpoint == null) {
    throw new Error('Need to provide data, or specify dataEndpoint')
  }

  if (contentEndpoint == null || terminologyEndpoint == null) {
    throw new Error('Need to specify content and terminology endpoints')
  }

  const contentResolver = Resolver(contentEndpoint)
  const terminologyResolver = Resolver(terminologyEndpoint)
  const dataResolver = dataEndpoint != null ? Resolver(dataEndpoint) : undefined

  // Create RequestGroup with instantiatesCanonical linked to PlanDefinition
  // and subject in focus:
  const planDefinitionCanonical = canonicalize(planDefinition)

  const instantiatesCanonical =
    planDefinitionCanonical != null ? [planDefinitionCanonical] : undefined

  const requestGroup: fhir4.RequestGroup = {
    resourceType: 'RequestGroup',
    id: uuidv4(),
    intent: 'proposal',
    status: 'draft',
    subject: referenceFromString(subject, 'Patient'),
    instantiatesCanonical
  }

  // Add Author if specified. If author and organization are specified, specify
  // as a PractitionerRole.
  if (author != null) {
    if (organization != null) {
      const practitionerRole: fhir4.PractitionerRole = {
        resourceType: 'PractitionerRole',
        id: uuidv4(),
        practitioner: referenceFromString(author, 'Practitioner'),
        organization: referenceFromString(organization, 'Organization')
      }
      requestGroup.author = referenceFromResource(practitionerRole)
      resourceBundle.entry.push(practitionerRole)
    } else {
      requestGroup.author = referenceFromString(author, 'Practitioner')
    }
  }

  // Add encounter if specified.
  if (encounter != null) {
    requestGroup.encounter = referenceFromString(encounter, 'Encounter')
  }

  // Add Goal is specified.
  if (planDefinition.goal != null) {
    requestGroup.extension = planDefinition.goal.map((goalProperties) => {
      // NOTE: Possible problem in the specification!
      //       planDef.goal.category is 0..1, but category is 0..* in Goal
      const category =
        goalProperties.category != null ? [goalProperties.category] : undefined

      const fixedGoalProperties = {
        ...goalProperties,
        category
      }

      const goal: fhir4.Goal = {
        resourceType: 'Goal',
        id: uuidv4(),
        subject: referenceFromString(subject, 'Patient'),
        lifecycleStatus: 'proposed',
        ...fixedGoalProperties
      }

      resourceBundle.entry?.push({ resource: goal })

      return {
        url: 'http://hl7.org/fhir/StructureDefinition/resource-pertainsToGoal',
        valueReference: referenceFromResource(goal)
      }
    })
  }

  // Add actions if any specified.
  if (planDefinition.action != null) {
    let libraryResults: any[] = []
    if (planDefinition.library != null) {
      libraryResults = await Promise.all(
        planDefinition.library.map(
          async (libraryCanonical) =>
            await contentResolver.resolveCanonical(libraryCanonical, [
              'Library'
            ])
        )
      )
    }
    const libraries = libraryResults.filter(is.Library)

    // Use for loop instead of .map so that actions are processed asynchronously. Otherwise request groups will be assigned to the incorrect actions
    let actionBundles = []
    for (const action of planDefinition.action) {
      const result = await applyPlanDefinitionAction(
        action,
        planDefinition,
        args,
        contentResolver,
        terminologyResolver,
        dataResolver,
        resourceBundle,
        libraries
      )
      actionBundles.push(result)
    }

    if (actionBundles != null) {
      requestGroup.action = actionBundles.map((a) => a?.action).filter(notEmpty)
    }
  }

  // Return Bundle with the primary request group first
  const entry: fhir4.BundleEntry[] = resourceBundle.entry
  entry.unshift({
    fullUrl: `${baseUrl}/RequestGroup/${requestGroup?.id ?? '1'}`,
    resource: removeUndefinedProps(requestGroup)
  })

  return {
    resourceType: 'Bundle',
    id: uuidv4(),
    type: 'collection',
    entry
  }
}
