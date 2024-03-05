import fs from 'fs'

export type RequestResource =
  | fhir4.MedicationRequest
  | fhir4.Task
  | fhir4.ServiceRequest
  | fhir4.CommunicationRequest
  | fhir4.ImmunizationRecommendation
  | fhir4.RequestGroup

const requestResourceTypes = [
  'Task',
  'ServiceRequest',
  'CommunicationRequest',
  'MedicationRequest',
  'ImmunizationRecommendation',
  'RequestGroup',
] as const

type RequestResourceType = typeof requestResourceTypes[number]

export const is = {
  CommunicationRequest: (
    resource: any
  ): resource is fhir4.CommunicationRequest => {
    return resource?.resourceType === 'CommunicationRequest'
  },
  Bundle: (resource: any): resource is fhir4.Bundle => {
    return resource?.resourceType === 'Bundle'
  },
  ImmunizationRecommendation: (
    resource: any
  ): resource is fhir4.ImmunizationRecommendation => {
    return resource?.resourceType === 'ImmunizationRecommendation'
  },
  MedicationRequest: (resource: any): resource is fhir4.MedicationRequest => {
    return resource?.resourceType === 'MedicationRequest'
  },
  PlanDefinition: (resource: any): resource is fhir4.PlanDefinition => {
    return resource?.resourceType === 'PlanDefinition'
  },
  RequestResource: (resource: any): resource is RequestResource => {
    return is.RequestResourceType(resource?.resourceType)
  },
  RequestResourceType: (
    resourceType: string | undefined
  ): resourceType is RequestResourceType => {
    return requestResourceTypes?.find((a) => a === resourceType) != null
  },
  ServiceRequest: (resource: any): resource is fhir4.ServiceRequest => {
    return resource?.resourceType === 'ServiceRequest'
  },
  Task: (resource: any): resource is fhir4.Task => {
    return resource?.resourceType === 'Task'
  },
}

/**
 * Return instantiates canonical reference from the request resource which points back to definition.
 *
 * Communication and Immunization use instantiates canonical extension.
 *
 * Other request resources use instantiatesCanonical which is an array. Expect there to be only 1 definition when calling $apply.
 *
 * @param resource Request Resource
 */
export const getInstantiatesCanonical = (resource: RequestResource) => {
  let canonical
  if (
    is.CommunicationRequest(resource) ||
    is.ImmunizationRecommendation(resource)
  ) {
    canonical =
      resource.extension
        ?.find(
          (e) =>
            (e.url =
              'http://hl7.org/fhir/StructureDefinition/workflow-instantiatesCanonical')
        )
        ?.valueCanonical?.split('|')[0] ?? undefined
  } else if (
    resource.instantiatesCanonical &&
    resource.instantiatesCanonical.length
  ) {
    canonical = resource.instantiatesCanonical[0].split('|')[0]
    resource.instantiatesCanonical.length > 1
      ? console.error(
          `Found more than one definition for request resource ${resource.resourceType}/${resource.id}: ${resource.instantiatesCanonical}.`
        )
      : null
  }
  return canonical
}

/**
 * Resolve resource from filesystem or rest endpoint
 *
 * @param id Id of resource to resolve
 * @param resourceType Type of resource to resolve
 * @param endpointAddress Address to use for search
 * @param version Optional version of resource
 */
export const resolveReference = async (
  id: string,
  resourceType: 'PlanDefinition' | 'Bundle',
  endpointAddress: string,
  version?: string | undefined
) => {
  let resource
  if (endpointAddress.startsWith('http')) {
    try {
      const versionQuery = version ? `&version=${version}` : null
      const response = await fetch(
        `${endpointAddress}/${resourceType}?_id=${id + versionQuery}`
      )
      if (!response.ok) {
        throw response
      }
      const json = await response.json()
      resource = json.entry[0].resource
    } catch (e) {
      console.log(e)
    }
  } else if (endpointAddress.startsWith('file://')) {
    const fileName = `${resourceType}-${id}.json`
    resource = JSON.parse(
      fs.readFileSync(`${endpointAddress.replace('file://', '')}/${fileName}`, {
        encoding: 'utf8',
      })
    )
  }
  return resource
}

/**
 * Remove canonical reference from a list of request resource references. This enables checking for requests that have not yet been tested against. Each time a request matches an assertion, it is removed.
 *
 * @param canonical Canonical reference to remove
 * @param resources List of remaining request resource canonicals from the $apply output
 */
export const removeFromRequests = (
  canonical: string | undefined,
  resources: string[] | undefined
) => {
  if (typeof canonical === 'string' && resources?.includes(canonical)) {
    resources = resources.filter((c) => c !== canonical)
  }
  return resources
}

export const isEmpty = (requests: string[] | undefined) => {
  return !requests || requests.length === 0
}

export const notEmpty = <TValue>(
  value: TValue | null | undefined
): value is TValue => {
  return value !== null && value !== undefined
}

export const createEndpoint = (type: string, address: string) => {
  let endpointType
  if (address.startsWith('file://')) {
    endpointType = 'hl7-fhir-file'
  } else if (address.startsWith('http')) {
    endpointType = 'hl7-fhir-rest'
  } else {
    throw new Error(`${type} endpoint must start with http or file`)
  }

  return {
    resourceType: 'Endpoint',
    address: address,
    status: 'active',
    payloadType: [
      {
        coding: [
          {
            code: type,
          },
        ],
      },
    ],
    connectionType: {
      code: endpointType,
    },
  } as fhir4.Endpoint
}
