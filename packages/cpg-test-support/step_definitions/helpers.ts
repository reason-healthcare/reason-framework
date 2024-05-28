import fs from 'fs'
import { TestContext } from './steps'
import { SelectionGroup } from './steps'

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
  ActivityDefinition: (
    resource: any
  ): resource is fhir4.ActivityDefinition => {
    return resource?.resourceType === 'ActivityDefinition'
  },
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
  RequestGroup: (resource: any): resource is fhir4.RequestGroup => {
    return resource?.resourceType === 'RequestGroup'
  },
}

/**
 * Return instantiates canonical from request resource without version.
 *
 * Communication and Immunization use instantiates canonical extension.
 *
 * Other request resources use instantiatesCanonical which is an array. Expect there to be only 1 definition when calling $apply.
 *
 * @param resource Request Resource
 * @returns canonical
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
 * Given action.resource, find matching request resource
 * @param action
 * @param bundle
 * @returns fhir4.RequestGroup | RequestResource | undefined
 */
export const resolveRequestResource = (
  action: fhir4.RequestGroupAction,
  bundle: fhir4.Bundle | undefined
) => {
  if (action.resource?.reference) {
    const id = action.resource.reference.split('/')[1]
    return bundle?.entry?.find((e) => e.resource?.id === id)?.resource as fhir4.RequestGroup
      | RequestResource
  }
}

export const findRecommendation = (
  identifier: string,
  recommendations: string[] | undefined
) => {
  return recommendations?.find((r) => r === identifier)
}

export const removeRecommendation = (identifier: string, recommendations: string[] | undefined) => {
  const index = recommendations?.indexOf(identifier)
  if (index != null) {
    recommendations?.splice(index, 1)
  }
  return recommendations
}

export const removeRecommendations = (identifiers: string[] | undefined, recommendations: string[] | undefined) => {
  return recommendations?.map(r => {
    const exists = identifiers?.includes(r)
    if (exists) {
      identifiers = removeRecommendation(r, identifiers)
    }
    return exists ? null : r
  }).filter(notEmpty)
}

export const findSelectionGroup = (
  selectionBehaviorCode: fhir4.RequestGroupAction['selectionBehavior'],
  identifiers: string[],
  selectionGroups: TestContext['selectionGroups']
) => {
  return selectionGroups.find((sg) => {
    return (
      sg.selectionCode === selectionBehaviorCode &&
      sg.definitions.sort().toString() === identifiers.sort().toString()
    )
  })
}

//TODO resolve ID from canonical helper

export const getNestedRecommendations = (
  action: fhir4.RequestGroupAction,
  bundle: fhir4.Bundle
) => {
  let recommendations: (string | undefined)[] = []

  const getRecommendations = (
    action: fhir4.RequestGroupAction,
    bundle: fhir4.Bundle,
    recommendations: (string | undefined)[]
  ) => {
    const requestResource = resolveRequestResource(action, bundle)
    if (requestResource) {
      recommendations.push(
        getInstantiatesCanonical(requestResource)?.split('/').pop()
      )
    }
    if (is.RequestGroup(requestResource) && requestResource.action) {
      requestResource.action.forEach((a) =>
        getRecommendations(a, bundle, recommendations)
      )
    }
    if (action.action) {
      action.action.forEach((a) =>
        getRecommendations(a, bundle, recommendations)
      )
    }
  }
  getRecommendations(action, bundle, recommendations)
  return recommendations.filter(notEmpty)
}

export const resolveAction = (
  identifier: string,
  action: fhir4.RequestGroupAction[],
  bundle: fhir4.Bundle
) => {
  let match = action.find((a) => {
    const id = resolveRequestResource(a, bundle) ?? a.title
    return id === identifier
  })
  if (!match) {
    action.forEach((a) => {
      if (a.action) {
        match = resolveAction(identifier, a.action, bundle)
      }
    })
  }
  return match
}

// TODOFor now, do not create selection group if not definitional
export const getNestedSelectionGroups = (
  action: fhir4.RequestGroupAction,
  bundle: fhir4.Bundle
) => {
  let selectionGroups: (SelectionGroup | undefined)[] = []

  const getSelectionGroups = (
    action: fhir4.RequestGroupAction,
    bundle: fhir4.Bundle,
    selectionGroups: (SelectionGroup | undefined)[]
  ) => {
    if (action.selectionBehavior && action.action) {
      const definitions = action.action
        .map((a) => {
          const requestResource = resolveRequestResource(a, bundle)
          return requestResource
            ? getInstantiatesCanonical(requestResource)?.split('/').pop()
            : null
        })
        .filter(notEmpty)
      ;(selectionGroups ||= []).push({
        selectionCode: action.selectionBehavior,
        definitions,
      })
    }
    if (action.resource?.reference) {
      const resource = resolveRequestResource(action, bundle)
      if (is.RequestGroup(resource) && resource.action) {
        resource.action.forEach(a => {
          getSelectionGroups(a, bundle, selectionGroups)
        })
      }
    }
    if (action.action) {
      action.action.forEach((a) =>
        getSelectionGroups(a, bundle, selectionGroups)
      )
    }
  }

  getSelectionGroups(action, bundle, selectionGroups)
  return selectionGroups.filter(notEmpty)
}

export const findRecommendationResources = (canonicals: string[] | undefined) => {
  return canonicals?.filter(c => {
    // const recommendationTypes = ["order-set", "eca-rule"]
    c.split("/")[-2] === "ActivityDefinition"
  })
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

export const isEmpty = (requests: any[] | undefined) => {
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
