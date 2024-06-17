import { Link, NavigateFunction, useNavigate } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import FileResolver from 'resolver/file'
import { v4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined
}

export type KnowledgeArtifact =
  | fhir4.PlanDefinition
  | fhir4.ActivityDefinition
  | fhir4.Library
export type TerminologyArtifact = fhir4.ValueSet | fhir4.CodeSystem

export const is = {
  PlanDefinition: (resource: any): resource is fhir4.PlanDefinition => {
    return resource?.resourceType === 'PlanDefinition'
  },
  ActivityDefinition: (resource: any): resource is fhir4.ActivityDefinition => {
    return resource?.resourceType === 'ActivityDefinition'
  },
  Bundle: (resource: any): resource is fhir4.Bundle => {
    return resource?.resourceType === 'Bundle'
  },
  Library: (resource: any): resource is fhir4.Library => {
    return resource?.resourceType === 'Library'
  },
  CodeSystem: (resource: any): resource is fhir4.CodeSystem => {
    return resource?.resourceType === 'CodeSystem'
  },
  ValueSet: (resource: any): resource is fhir4.ValueSet => {
    return resource?.resourceType === 'ValueSet'
  },
  StructureDefinition: (
    resource: any
  ): resource is fhir4.StructureDefinition => {
    return resource?.resourceType === 'StructureDefinition'
  },
  KnowledgeArtifact: (resource: any): resource is KnowledgeArtifact => {
    return (
      is.PlanDefinition(resource) ||
      is.ActivityDefinition(resource) ||
      is.Library(resource)
    )
  },
  TerminologyArtifact: (resource: any): resource is TerminologyArtifact => {
    return is.ValueSet(resource) || is.CodeSystem(resource)
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

export const formatTitle = (
  resource:
    | fhir4.StructureDefinition
    | TerminologyArtifact
    | KnowledgeArtifact
    | fhir4.PlanDefinitionAction
) => {
  let header
  if (
    is.KnowledgeArtifact(resource) ||
    is.StructureDefinition(resource) ||
    is.TerminologyArtifact(resource)
  ) {
    const { title, name, url, id } = resource
    header = title ?? name ?? url ?? id
  } else {
    const { title, id } = resource
    header = title ?? id
  }
  return header
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
            Coding: {c.code} from {systemDisplay ?? c.system}
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

export const formatProdcuts = (
  products: fhir4.ActivityDefinition['productCodeableConcept']
) => {
  return products?.coding?.map((c: fhir4.Coding) => {
    return (
      <li key={v4()}>
        {c.display}
        {c.code ? (
          <p>
            Coding: {c.code} {c.system}
          </p>
        ) : undefined}
      </li>
    )
  })
}

export const formatDosageText = (text: fhir4.Dosage['text']) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
}

export const formatActions = (actions: fhir4.PlanDefinitionAction[]) => {
  let index = 0
  return actions
    .map((a) => {
      const header = formatTitle(a)
      index += 1
      return (
        <li key={v4()}>
          {header ?? `Action ${index} (no identifier available)`}
        </li>
      )
    })
    .filter(notEmpty)
}

export const formatApplicabilities = (
  condition: fhir4.PlanDefinitionAction['condition']
) => {
  return condition?.map((c) => {
    return <li key={v4()}>{c.expression?.expression ?? null}</li>
  })
}

export const formatDescription = (description: string | undefined) => {
  if (!description) {
    return undefined
  }
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
  )
}

export const isMarkdown = (content: any) => {
  return /^[\s\S]+$/.test(content)
}
