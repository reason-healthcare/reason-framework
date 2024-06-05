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
  Library: (resource: any): resource is fhir4.Library => {
    return resource?.resourceType === 'Library'
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

export const resolveReference = (
  reference: string | undefined,
  resolver: BrowserResolver
) => {
  return reference != null
    ? resolver.resourcesByReference[reference]
    : undefined
}

export const resolveCql = (
  reference: string | undefined,
  resolver: BrowserResolver
) => {
  return reference != null ? resolver.cqlByReference[reference] : undefined
}

export const formatCodeableConcept = (
  codeableConcept: fhir4.CodeableConcept
) => {
  return codeableConcept?.coding?.map((c: fhir4.Coding) => {
    return (
      <li key={c.code}>
        {c.display}
        {c.code ? (
          <p>
            Coding: {c.code} from {c.system}
          </p>
        ) : undefined}
      </li>
    )
  })
}
