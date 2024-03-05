import { v4 as uuidv4 } from 'uuid'
import { processDynamicValue } from './expression'
import {
  referenceFromString,
  RequestResource,
  is,
  removeUndefinedProps,
  canonicalize,
  inspect,
  notEmpty
} from './helpers'
import Resolver from './resolver'

/**
 * Based on [Apply Operation](https://hl7.org/fhir/uv/cpg/OperationDefinition-cpg-plandefinition-apply.html)
 */
export interface ApplyActivityDefinitionArgs {
  activityDefinition: fhir4.ActivityDefinition
  subject: string // TODO: This should be 1..*
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
 * See [Applying an ActivityDefinition](https://www.hl7.org/fhir/activitydefinition.html#12.17.3.3)
 *
 * 1. Create the target resource of the type specified by the kind element and
 *    focused on the Patient in context
 * 2. Set the status of the target resource to draft
 * 3. Apply the structural elements of the ActivityDefinition to the target
 *    resource such as code, timing, doNotPerform, product, quantity, dosage, and
 *    so on
 * 4. Resolve the participant element based on the user in context
 * 5. Resolve the location element based on the location in context
 * 6. If the transform element is specified, apply the transform to the
 *    resource. Note that the referenced StructureMap may actually construct the
 *    resource, rather than taking an instance. See the StructureMap for more
 *    information
 * 7. Apply any dynamicValue elements (in the order in which they appear in the
 *    ActivityDefinition resource) by evaluating the expression and setting the
 *    value of the appropriate element of the target resource (as specified by
 *    the dynamicValue.path element)
 *
 * @param args Apply operation ards
 * @returns Bundle with the first entry as the target resource
 */
export const applyActivityDefinition = async (
  args: ApplyActivityDefinitionArgs
): Promise<RequestResource | undefined> => {
  const {
    subject,
    data,
    practitioner,
    organization,
    encounter,
    activityDefinition,
    contentEndpoint,
    terminologyEndpoint,
    dataEndpoint
  } = args

  if (data == null && dataEndpoint == null) {
    throw new Error('Need to provide data, or specify dataEndpoint')
  }

  if (contentEndpoint == null || terminologyEndpoint == null) {
    throw new Error('Need to specify content and terminology endpoints')
  }

  const contentResolver = Resolver(contentEndpoint)
  const terminologyResolver = Resolver(terminologyEndpoint)
  const dataResolver = dataEndpoint != null ? Resolver(dataEndpoint) : undefined

  const {
    kind: resourceType,
    intent,
    code,
    timingTiming,
    timingDateTime,
    timingPeriod,
    timingRange,
    timingDuration,
    doNotPerform,
    productCodeableConcept,
    productReference,
    quantity,
    dosage,
    bodySite,
    priority,
    profile
  } = activityDefinition

  if (resourceType != null && is.RequestResourceType(resourceType)) {
    // const meta: fhir4.Meta = {}
    // if (profile != null) {
    //   meta.profile = [profile]
    // }
    const targetResource = {
      id: uuidv4(),
      // meta,
      resourceType,
      status: 'draft'
    }

    const canonicalActivityDefinition = canonicalize(activityDefinition)

    if (intent != null && is.RequestResourceWithIntent(targetResource)) {
      targetResource.intent = intent
    }

    // For each resource type, assign properties:
    if (is.Appointment(targetResource)) {
      // TODO / Questions:
      // 1. Mapping AD.participant to App.participant
      // 2. Mapping AD.location to App.participant
      // 3. Mapping AD.priority to App.priority

      if (timingPeriod != null) {
        ;(targetResource.requestedPeriod ||= []).push(timingPeriod)
      }
      if (subject != null) {
        targetResource.participant = [
          {
            actor: referenceFromString(subject, 'Patient'),
            status: 'needs-action'
          }
        ]
      }
    } else if (is.AppointmentResponse(targetResource)) {
      // TODO: How to handle required AR.appointment?
      targetResource.participantStatus = 'needs-action'
      if (timingPeriod != null) {
        targetResource.start = timingPeriod.start
        targetResource.end = timingPeriod.end
      }
    } else if (is.CarePlan(targetResource)) {
      if (canonicalActivityDefinition != null) {
        ;(targetResource.instantiatesCanonical ||= []).push(
          canonicalActivityDefinition
        )
      }
      if (timingPeriod != null) {
        targetResource.period = timingPeriod
      }
      if (encounter != null) {
        targetResource.encounter = referenceFromString(encounter, 'Encounter')
      }
      if (practitioner != null) {
        targetResource.author = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      if (organization != null) {
        ;(targetResource.contributor ||= []).push(
          referenceFromString(organization, 'Organization')
        )
      }
      if (subject != null) {
        targetResource.subject = referenceFromString(subject, 'Patient')
      }
    } else if (is.Claim(targetResource)) {
      if (practitioner != null) {
        targetResource.provider = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
    } else if (is.CommunicationRequest(targetResource)) {
      if (canonicalActivityDefinition != null) {
        ;(targetResource.extension ||= []).push(
          {
            url: "http://hl7.org/fhir/StructureDefinition/workflow-instantiatesCanonical",
            valueCanonical: canonicalActivityDefinition
          }
        )
      }
      if (timingDateTime != null) {
        targetResource.occurrenceDateTime = timingDateTime
      }
      if (timingPeriod != null) {
        targetResource.occurrencePeriod = timingPeriod
      }
      if (practitioner != null) {
        targetResource.requester = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      if (encounter != null) {
        targetResource.encounter = referenceFromString(encounter, 'Encounter')
      }
      if (subject != null) {
        targetResource.subject = referenceFromString(subject, 'Patient')
      }
      if (doNotPerform != null) {
        targetResource.doNotPerform = doNotPerform
      }
    } else if (is.Contract(targetResource)) {
      if (practitioner != null) {
        targetResource.author = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      if (organization != null) {
        ;(targetResource.authority ||= []).push(
          referenceFromString(organization, 'Organization')
        )
      }
    } else if (is.DeviceRequest(targetResource)) {
      if (canonicalActivityDefinition != null) {
        ;(targetResource.instantiatesCanonical ||= []).push(
          canonicalActivityDefinition
        )
      }
      // TODO: Semantics regarding code, vs productCodableConcept here
      if (code != null) {
        targetResource.codeCodeableConcept = code
      }
      if (productCodeableConcept != null) {
        targetResource.codeCodeableConcept = productCodeableConcept
      }
      if (productReference != null) {
        targetResource.codeReference = productReference
      }
      if (encounter != null) {
        targetResource.encounter = referenceFromString(encounter, 'Encounter')
      }
      if (practitioner != null) {
        targetResource.requester = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      if (subject != null) {
        targetResource.subject = referenceFromString(subject, 'Patient')
      }
    } else if (is.EnrollmentRequest(targetResource)) {
      if (subject != null) {
        targetResource.candidate = referenceFromString(subject, 'Patient')
      }
      if (practitioner != null) {
        targetResource.provider = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
    } else if (is.ImmunizationRecommendation(targetResource)) {
      if (canonicalActivityDefinition != null) {
        ;(targetResource.extension ||= []).push(
          {
            url: "http://hl7.org/fhir/StructureDefinition/workflow-instantiatesCanonical",
            valueCanonical: canonicalActivityDefinition
          }
        )
      }
      if (subject != null) {
        targetResource.patient = referenceFromString(subject, 'Patient')
      }
      if (productCodeableConcept != null) {
        targetResource.recommendation = [
          {
            vaccineCode: [productCodeableConcept],
            forecastStatus: {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/immunization-recommendation-status',
                  code: 'due',
                  display: 'Due'
                }
              ]
            }
          }
        ]
      }
      const date = new Date()
      targetResource.date = date.toISOString()
    } else if (is.MedicationRequest(targetResource)) {
      if (canonicalActivityDefinition != null) {
        ;(targetResource.instantiatesCanonical ||= []).push(
          canonicalActivityDefinition
        )
      }
      if (subject != null) {
        targetResource.subject = referenceFromString(subject, 'Patient')
      }
      if (practitioner != null) {
        targetResource.requester = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      if (encounter != null) {
        targetResource.encounter = referenceFromString(encounter, 'Encounter')
      }
      if (doNotPerform != null) {
        targetResource.doNotPerform = doNotPerform
      }
      if (productCodeableConcept != null) {
        targetResource.medicationCodeableConcept = productCodeableConcept
      }
      if (productReference != null) {
        targetResource.medicationReference = productReference
      }
      if (dosage != null) {
        ;(targetResource.dosageInstruction ||= []).push(...dosage)
      }

      const newDosage: fhir4.Dosage = {}

      // TODO: How to handle timingAge?
      // if (timingAge) {
      // }
      if (timingDateTime != null) {
        ;((newDosage.timing ||= {}).event ||= []).push(timingDateTime)
      }
      if (timingDuration != null) {
        ;((newDosage.timing ||= {}).repeat ||= {}).boundsDuration =
          timingDuration
      }
      if (timingPeriod != null) {
        ;((newDosage.timing ||= {}).repeat ||= {}).boundsPeriod = timingPeriod
      }
      if (timingRange != null) {
        ;((newDosage.timing ||= {}).repeat ||= {}).boundsRange = timingRange
      }
      if (timingTiming != null) {
        newDosage.timing = timingTiming
      }
      if (bodySite != null) {
        // TODO: AD.bodySite is array, MR.dosage.site is not
        newDosage.site = bodySite[0]
        if (bodySite.length > 1) {
          console.warn(
            'The ActivityDefinition defines more than one site, a medication request has only one.'
          )
        }
      }
      if (quantity != null) {
        newDosage.doseAndRate = [{ doseQuantity: quantity }]
      }

      ;(targetResource.dosageInstruction ||= []).push(newDosage)
    } else if (is.NutritionOrder(targetResource)) {
      if (canonicalActivityDefinition != null) {
        ;(targetResource.instantiatesCanonical ||= []).push(
          canonicalActivityDefinition
        )
      }
      if (subject != null) {
        targetResource.patient = referenceFromString(subject, 'Patient')
      }
      if (encounter != null) {
        targetResource.encounter = referenceFromString(encounter, 'Encounter')
      }
      if (practitioner != null) {
        targetResource.orderer = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
    } else if (is.ServiceRequest(targetResource)) {
      if (canonicalActivityDefinition != null) {
        ;(targetResource.instantiatesCanonical ||= []).push(
          canonicalActivityDefinition
        )
      }
      if (subject != null) {
        targetResource.subject = referenceFromString(subject, 'Patient')
      }
      if (encounter != null) {
        targetResource.encounter = referenceFromString(encounter, 'Encounter')
      }
      if (practitioner != null) {
        targetResource.requester = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      if (doNotPerform != null) {
        targetResource.doNotPerform = doNotPerform
      }
      if (code != null) {
        targetResource.code = code
      }
      if (quantity != null) {
        targetResource.quantityQuantity = quantity
      }
      if (bodySite != null) {
        targetResource.bodySite = bodySite
      }
      if (productCodeableConcept != null) {
        targetResource.code = productCodeableConcept
      }
      if (productReference != null) {
        console.warn(`For ServiceRequest, use productCodeableConcept.`)
      }
      if (timingTiming != null) {
        targetResource.occurrenceTiming = timingTiming
      }
      if (timingDateTime != null) {
        targetResource.occurrenceDateTime = timingDateTime
      }
      if (timingPeriod != null) {
        targetResource.occurrencePeriod = timingPeriod
      }
    } else if (is.SupplyRequest(targetResource)) {
      if (practitioner != null) {
        targetResource.requester = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      if (quantity != null) {
        targetResource.quantity = quantity
      }
      if (productCodeableConcept != null) {
        targetResource.itemCodeableConcept = productCodeableConcept
      }
      if (productReference != null) {
        targetResource.itemReference = productReference
      }
      if (timingTiming != null) {
        targetResource.occurrenceTiming = timingTiming
      }
      if (timingDateTime != null) {
        targetResource.occurrenceDateTime = timingDateTime
      }
      if (timingPeriod != null) {
        targetResource.occurrencePeriod = timingPeriod
      }
    } else if (is.Task(targetResource)) {
      if (canonicalActivityDefinition != null) {
        // NOTE: This is not an array here?
        targetResource.instantiatesCanonical = canonicalActivityDefinition
      }
      if (subject != null) {
        targetResource.for = referenceFromString(subject, 'Patient')
      }
      if (encounter != null) {
        targetResource.encounter = referenceFromString(encounter, 'Encounter')
      }
      if (practitioner != null) {
        targetResource.requester = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      if (code != null) {
        targetResource.code = code
      }
      if (priority != null) {
        targetResource.priority = priority
      }
      if (intent != null) {
        if (intent === 'directive') {
          targetResource.intent = 'unknown'
        } else {
          targetResource.intent = intent
        }
      }
      if (timingPeriod != null) {
        targetResource.executionPeriod = timingPeriod
      }
      if (doNotPerform != null && doNotPerform === true) {
        targetResource.modifierExtension = [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/request-doNotPerform',
            valueBoolean: true
          }
        ]
      }
    } else if (is.VisionPrescription(targetResource)) {
      if (subject != null) {
        targetResource.patient = referenceFromString(subject, 'Patient')
      }
      if (encounter != null) {
        targetResource.encounter = referenceFromString(encounter, 'Encounter')
      }
      if (practitioner != null) {
        targetResource.prescriber = referenceFromString(
          practitioner,
          'Practitioner'
        )
      }
      targetResource.created = new Date().toISOString()
    }

    // Dynamic Values
    let libraryResults: any[] = []

    if (activityDefinition.library != null) {
      libraryResults = await Promise.all(
        activityDefinition.library.map(
          async (libraryCanonical) =>
            await contentResolver.resolveCanonical(libraryCanonical, [
              'Library'
            ])
        )
      )
    }

    const dynamicValueExpressions = activityDefinition.dynamicValue?.map(
      (dv) => dv.expression
    )
    if (dynamicValueExpressions != null) {
      libraryResults.push(
        await Promise.all(
          dynamicValueExpressions
            .map(async (expression) => {
              const { reference } = expression
              if (reference != null) {
                await contentResolver.resolveCanonical(reference)
              }
            })
            .filter(notEmpty)
        )
      )
    }
    const libraries = libraryResults.filter(is.Library)

    let newTargetResources: (
      | RequestResource
      | fhir4.Questionnaire
      | undefined
    )[] = []

    if (activityDefinition.dynamicValue != null) {
      newTargetResources = await Promise.all(
        activityDefinition.dynamicValue.map(async (dynamicValue) => {
          if (is.RequestResource(targetResource)) {
            return await processDynamicValue(
              dynamicValue,
              activityDefinition,
              targetResource,
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
          }
        })
      )
    }

    newTargetResources
      .filter((r) => is.RequestResource(r) || is.Questionnaire(r))
      .forEach((resource) => Object.assign(targetResource, resource))

    if (activityDefinition?.transform != null) {
      console.warn('ActivityDefinition.transform is not supported.')
    }

    if (is.RequestResource(targetResource)) {
      return removeUndefinedProps(targetResource)
    }
  }
}
