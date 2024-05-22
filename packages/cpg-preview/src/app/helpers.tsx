import BrowserResolver from 'resolver/browser'
import FileResolver from 'resolver/file'

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined
}

export const is = {
  planDefinition: (resource: any): resource is fhir4.PlanDefinition => {
    return resource?.resourceType === 'PlanDefinition'
  },
  activityDefinition: (resource: any): resource is fhir4.ActivityDefinition => {
    return resource?.resourceType === 'ActivityDefinition'
  },
  bundle: (resource: any): resource is fhir4.Bundle => {
    return resource?.resourceType === 'Bundle'
  },
  structureDefinition: (
    resource: any
  ): resource is fhir4.StructureDefinition => {
    return resource?.resourceType === 'StructureDefinition'
  },
}

export const resolveCanonical = (
  canonical: string | undefined,
  resolver: FileResolver | BrowserResolver
) => {
  canonical = canonical?.split('|').shift()
  return canonical != null && resolver.resourcesByCanonical
    ? resolver.resourcesByCanonical[canonical]
    : undefined
}
