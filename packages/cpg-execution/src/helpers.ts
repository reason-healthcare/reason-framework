import util from 'node:util'

export const terminologyResources = ['CodeSystem', 'ConceptMap', 'ValueSet']

export const knowledgeResources = [
  'ActivityDefinition',
  'Library',
  'Measure',
  'PlanDefinition',
  'Questionnaire',
  'StructureDefinition'
]

export const canonicalResources = [
  'ActivityDefinition',
  'CapabilityStatement',
  'ChargeItemDefinition',
  'CodeSystem',
  'CompartmentDefinition',
  'ConceptMap',
  'EffectEvidenceSynthesis',
  'EventDefinition',
  'Evidence',
  'EvidenceVariable',
  'ExampleScenario',
  'GraphDefinition',
  'ImplementationGuide',
  'Library',
  'Measure',
  'MessageDefinition',
  'OperationDefinition',
  'PlanDefinition',
  'Questionnaire',
  'ResearchDefinition',
  'ResearchElementDefinition',
  'RiskEvidenceSynthesis',
  'SearchParameter',
  'StructureDefinition',
  'StructureMap',
  'TerminologyCapabilities',
  'TestScript',
  'ValueSet'
]

export type CanonicalResource =
  | fhir4.ActivityDefinition
  | fhir4.CapabilityStatement
  | fhir4.ChargeItemDefinition
  | fhir4.CodeSystem
  | fhir4.CompartmentDefinition
  | fhir4.ConceptMap
  | fhir4.EffectEvidenceSynthesis
  | fhir4.EventDefinition
  | fhir4.Evidence
  | fhir4.EvidenceVariable
  | fhir4.ExampleScenario
  | fhir4.GraphDefinition
  | fhir4.ImplementationGuide
  | fhir4.Library
  | fhir4.Measure
  | fhir4.MessageDefinition
  | fhir4.OperationDefinition
  | fhir4.PlanDefinition
  | fhir4.Questionnaire
  | fhir4.ResearchDefinition
  | fhir4.ResearchElementDefinition
  | fhir4.RiskEvidenceSynthesis
  | fhir4.SearchParameter
  | fhir4.StructureDefinition
  | fhir4.StructureMap
  | fhir4.TerminologyCapabilities
  | fhir4.TestScript
  | fhir4.ValueSet

export type RequestResource =
  | fhir4.Appointment
  | fhir4.AppointmentResponse
  | fhir4.CarePlan
  | fhir4.Claim
  | fhir4.CommunicationRequest
  | fhir4.Contract
  | fhir4.DeviceRequest
  | fhir4.EnrollmentRequest
  | fhir4.ImmunizationRecommendation
  | fhir4.MedicationRequest
  | fhir4.NutritionOrder
  | fhir4.RequestGroup
  | fhir4.ServiceRequest
  | fhir4.SupplyRequest
  | fhir4.Task
  | fhir4.VisionPrescription

export type RequestResourceWithIntent =
  | fhir4.CarePlan
  | fhir4.DeviceRequest
  | fhir4.MedicationRequest
  | fhir4.ServiceRequest
  | fhir4.Task

export const requestResourceTypes = [
  'Appointment',
  'AppointmentResponse',
  'CarePlan',
  'Claim',
  'CommunicationRequest',
  'Contract',
  'DeviceRequest',
  'EnrollmentRequest',
  'ImmunizationRecommendation',
  'MedicationRequest',
  'NutritionOrder',
  'ServiceRequest',
  'SupplyRequest',
  'Task',
  'VisionPrescription'
] as const

export type RequestResourceType = typeof requestResourceTypes[number]

/**
 * Create a canonical URL for a resource.
 *
 * @param resource Canonical resource
 * @returns Canonical reference
 */
export const canonicalize = (
  resource: CanonicalResource
): string | undefined => {
  if (resource?.url != null) {
    const version = resource?.version != null ? `|${resource.version}` : ''
    return `${resource.url}${version}`
  }
}

/**
 * Create a string reference
 *
 * @param reference reference ("123", or "Patient/123")
 * @param resourceType type of resource
 * @returns
 */
export const referenceFromString = (
  reference: string,
  resourceType: string
): fhir4.Reference => {
  return reference?.includes('/')
    ? { reference }
    : { reference: `${resourceType}/${reference}`, type: resourceType }
}

export const referenceFromResource = (
  resource: fhir4.FhirResource | undefined
): fhir4.Reference | undefined => {
  if (resource?.resourceType !== undefined && resource?.id !== undefined) {
    const reference = `${resource.resourceType}/${resource.id}`
    return { reference }
  }
}

export const removeUndefinedProps = (data: any): any => {
  if (typeof data !== 'object') {
    return data
  }

  return Object.keys(data).reduce(function (accumulator, key) {
    const isObject = typeof data[key] === 'object' && data[key] != null
    let value = isObject ? removeUndefinedProps(data[key]) : data[key]

    if (Array.isArray(data[key])) {
      value = Object.values(value).filter((o) => {
        if (o == null) {
          return false
        } else if (Array.isArray(o)) {
          return o.some((i) => i != null)
        } else if (typeof o === 'object') {
          return Object.values(o).some((i) => i != null)
        } else {
          return true
        }
      })
    }

    if (value == null || (Array.isArray(value) && value.length === 0)) {
      return accumulator
    }

    return Object.assign(accumulator, { [key]: value })
  }, {})
}

export const is = {
  ActivityDefinition: (resource: any): resource is fhir4.ActivityDefinition => {
    return resource?.resourceType === 'ActivityDefinition'
  },
  Appointment: (resource: any): resource is fhir4.Appointment => {
    return resource?.resourceType === 'Appointment'
  },
  AppointmentResponse: (
    resource: any
  ): resource is fhir4.AppointmentResponse => {
    return resource?.resourceType === 'AppointmentResponse'
  },
  Bundle: (resource: any): resource is fhir4.Bundle => {
    return resource?.resourceType === 'Bundle'
  },
  BundleEntry: (resource: any): resource is fhir4.BundleEntry => {
    if (resource == null) {
      return false
    }

    if (!Object.values(resource).every(notEmpty)) {
      return false
    }

    const keys = new Set(Object.keys(resource))
    keys.add('link')
    keys.add('fullUrl')
    keys.add('search')
    keys.add('resource')
    keys.add('request')
    keys.add('response')
    return keys.size === 6
  },
  CarePlan: (resource: any): resource is fhir4.CarePlan => {
    return resource?.resourceType === 'CarePlan'
  },
  Claim: (resource: any): resource is fhir4.Claim => {
    return resource?.resourceType === 'Claim'
  },
  Contract: (resource: any): resource is fhir4.Contract => {
    return resource?.resourceType === 'Contract'
  },
  ClaimResponse: (resource: any): resource is fhir4.ClaimResponse => {
    return resource?.resourceType === 'ClaimResponse'
  },
  CommunicationRequest: (
    resource: any
  ): resource is fhir4.CommunicationRequest => {
    return resource?.resourceType === 'CommunicationRequest'
  },
  DeviceRequest: (resource: any): resource is fhir4.DeviceRequest => {
    return resource?.resourceType === 'DeviceRequest'
  },
  Encounter: (resource: any): resource is fhir4.Encounter => {
    return resource?.resourceType === 'Encounter'
  },
  EnrollmentRequest: (resource: any): resource is fhir4.EnrollmentRequest => {
    return resource?.resourceType === 'EnrollmentRequest'
  },
  FhirResource: (resource: any): resource is fhir4.FhirResource => {
    return resource?.resourceType != null
  },
  Goal: (resource: any): resource is fhir4.Goal => {
    return resource?.resourceType === 'Goal'
  },
  ImmunizationRecommendation: (
    resource: any
  ): resource is fhir4.ImmunizationRecommendation => {
    return resource?.resourceType === 'ImmunizationRecommendation'
  },
  Library: (resource: any): resource is fhir4.Library => {
    return resource?.resourceType === 'Library'
  },
  MedicationRequest: (resource: any): resource is fhir4.MedicationRequest => {
    return resource?.resourceType === 'MedicationRequest'
  },
  NutritionOrder: (resource: any): resource is fhir4.NutritionOrder => {
    return resource?.resourceType === 'NutritionOrder'
  },
  Organization: (resource: any): resource is fhir4.Organization => {
    return resource?.resourceType === 'Organization'
  },
  Patient: (resource: any): resource is fhir4.Patient => {
    return resource?.resourceType === 'Patient'
  },
  PlanDefinition: (resource: any): resource is fhir4.PlanDefinition => {
    return resource?.resourceType === 'PlanDefinition'
  },
  Practitioner: (resource: any): resource is fhir4.Practitioner => {
    return resource?.resourceType === 'Practitioner'
  },
  Questionnaire: (resource: any): resource is fhir4.Questionnaire => {
    return resource?.resourceType === 'Questionnaire'
  },
  QuestionnaireItemType(dataType: string): dataType is fhir4.QuestionnaireItem["type"] {
    return dataType === "string" || dataType === "boolean" || dataType === "group" || dataType === "display" || dataType === "question" || dataType === "decimal" || dataType === "integer" || dataType === "date" || dataType === "dateTime" || dataType === "time" || dataType === "text" || dataType === "url" || dataType === "choice" || dataType === "open-choice" || dataType.toLowerCase() === "attachment" || dataType.toLowerCase() === "reference" || dataType.toLowerCase() === "quantity"
  },
  RequestGroup: (resource: any): resource is fhir4.RequestGroup => {
    return resource?.resourceType === 'RequestGroup'
  },
  RequestResource: (resource: any): resource is RequestResource => {
    return is.RequestResourceType(resource?.resourceType)
  },
  RequestResourceType: (
    resourceType: string | undefined
  ): resourceType is RequestResourceType => {
    return requestResourceTypes?.find((a) => a === resourceType) != null
  },
  RequestResourceWithIntent: (
    resource: any
  ): resource is RequestResourceWithIntent => {
    return (
      is.CarePlan(resource) ||
      is.DeviceRequest(resource) ||
      is.MedicationRequest(resource) ||
      is.ServiceRequest(resource) ||
      is.Task(resource)
    )
  },
  StructureDefinition: (resource: any): resource is fhir4.StructureDefinition => {
    return resource?.resourceType === 'StructureDefinition'
  },
  SupplyRequest: (resource: any): resource is fhir4.SupplyRequest => {
    return resource?.resourceType === 'SupplyRequest'
  },
  ServiceRequest: (resource: any): resource is fhir4.ServiceRequest => {
    return resource?.resourceType === 'ServiceRequest'
  },
  Task: (resource: any): resource is fhir4.Task => {
    return resource?.resourceType === 'Task'
  },
  ValueSet: (resource: any): resource is fhir4.ValueSet => {
    return resource?.resourceType === 'ValueSet'
  },
  VisionPrescription: (resource: any): resource is fhir4.VisionPrescription => {
    return resource?.resourceType === 'VisionPrescription'
  }
}

export const handleError = (
  e: unknown,
  level: 'error' | 'warn' | 'info' | 'debug' = 'warn'
): void => {
  if (typeof e === 'string' || e instanceof Error) {
    console[level](e)
  } else {
    console[level](JSON.stringify(e))
  }
}

export const notEmpty = <TValue>(
  value: TValue | null | undefined
): value is TValue => {
  return value !== null && value !== undefined
}

export const safeBundleEntryPush = (
  bundle: fhir4.Bundle,
  bundleEntry: fhir4.BundleEntry | null
): void => {
  if (bundleEntry == null || !is.BundleEntry(bundleEntry)) {
    console.warn('not a bundle entry', inspect(bundleEntry))
    return
  }
  if (bundleEntry.fullUrl == null && bundleEntry.resource != null) {
    const { resource } = bundleEntry
    if (resource.resourceType != null && resource.id != null) {
      bundleEntry.fullUrl = `${baseUrl}/${resource.resourceType}/${resource.id}`
    }
  }
  ;(bundle.entry ||= []).push(bundleEntry)
}

export const inspect = (obj: any): string => {
  return util.inspect(obj, { depth: 10 })
}

export let baseUrl =
  process.env.BASE_URL != null ? process.env.BASE_URL : 'http://apply-processor'
if (baseUrl.endsWith('/')) {
  baseUrl = baseUrl.slice(0, -1)
}

export let questionnaireBaseUrl =
  process.env.BASE_URL != null ? process.env.BASE_URL : 'http://questionnaire-processor'
if (baseUrl.endsWith('/')) {
  baseUrl = baseUrl.slice(0, -1)
}

export const omitCanonicalVersion = (canonical: string | undefined): string | undefined => {
  return canonical?.split("|").shift()
}

export const getSnapshotDefinition = (snapshotElements: fhir4.StructureDefinitionSnapshot["element"] | undefined, element: fhir4.ElementDefinition) => {

  let snapshotElement: fhir4.ElementDefinition | undefined
  snapshotElements?.forEach(e => {
    if (element.sliceName && element.path === e.path && element.sliceName === e.sliceName) {
      snapshotElement = e
    } else if (e.path.endsWith('[x]') && e.sliceName && element.path === `${getPathPrefix(e.path)}.${e.sliceName}`) {
      snapshotElement = e
    } else if (e.path.includes('[x]') && e.base?.path && element.path === e.path.replace(/\[x\].+/, e.base.path)) {
      snapshotElement = e
    } else if (e.path === element.path) {
      snapshotElement = e
    }
  })

  return snapshotElement

}

export const getPathPrefix = (path: fhir4.ElementDefinition["path"]): fhir4.ElementDefinition["path"] => {
  const prefix = path.split(".")
  prefix.pop()
  return prefix.join(".")
}
