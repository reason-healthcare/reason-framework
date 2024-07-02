import { Link, NavigateFunction, useNavigate } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import FileResolver from 'resolver/file'
import { v4 } from 'uuid'
import SingleDisplayItem from './components/SingleDisplayItem'

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
  CodeSystem: (resource: any): resource is fhir4.CodeSystem => {
    return resource?.resourceType === 'CodeSystem'
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
  codeableConcept: fhir4.CodeableConcept,
  resolver?: FileResolver | BrowserResolver | undefined
) => {
  return codeableConcept?.coding?.map((c: fhir4.Coding) => {
    let systemDisplay
    if (c.system && resolver) {
      const resource = resolveCanonical(c.system, resolver)
      if (is.CodeSystem(resource)) {
        systemDisplay =
          resource?.title ?? resource.name ?? resource.url ?? resource.id
      }
    }
    return (
      <li key={c.code}>
        {c.display}
        {c.code ? (
          <p>
            Coding: "{c.code}" from {systemDisplay ?? c.system}
          </p>
        ) : undefined}
      </li>
    )
  })
}

export const formatRelatedArtifact = (
  artifact: fhir4.RelatedArtifact[],
  resolver?: FileResolver | BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  return artifact.map((e: any) => {
    let resourceDisplay
    if (e.resource && resolver) {
      const rawResource = resolveCanonical(e.resource, resolver)
      if (is.Library(rawResource) && navigate) {
        console.log('here')
        resourceDisplay = (
          <Link
            onClick={() => navigate(`/Library/${rawResource.id}`)}
            to={`/Library/${rawResource.id}`}
          >
            {rawResource.title ??
              rawResource.name ??
              rawResource.url ??
              rawResource.id}
          </Link>
        )
      }
    }
    return (
      <li key={v4()}>
        {e?.type && e.type.charAt(0).toUpperCase() + e.type.slice(1) + ': '}
        {(e.display || e.label) && <p>{e.display ?? e.label}</p>}
        {e.citation && <p>{e.citation}</p>}
        {e.url && (
          <p>
            <Link to={e.url} target="blank">
              {e.url}
            </Link>
          </p>
        )}
        {e.document?.title && (
          <p>
            <Link to="">{e.document.title}</Link>
          </p>
        )}{' '}
        {/* {resourceDisplay} */}
      </li>
    )
  })
}
