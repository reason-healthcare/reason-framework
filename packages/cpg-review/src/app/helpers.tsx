import { Link, NavigateFunction, useNavigate } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import FileResolver from 'resolver/file'
import { v4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Markdown from 'react-markdown'
import SingleDisplayItem from './components/SingleDisplayItem'
import ListDisplayItem from './components/ListDisplayItem'
import { uuid } from 'uuidv4'

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
  Coding: (object: any): object is fhir4.Coding => {
    const keys = ['code', '_code',
      'display', '_display',
      'system', '_system',
      'userSelected', '_userSelected',
      'version', '_version']
    return (
      object &&
      Object.keys(object).every(k => keys.includes(k)) &&
      (typeof object.code === 'string' || object.code === undefined) &&
      (typeof object._code === 'object' || object._code === undefined) &&
      (typeof object.display === 'string' || object.display === undefined) &&
      (typeof object._display === 'object' || object._display === undefined) &&
      (typeof object.system === 'string' || object.system === undefined) &&
      (typeof object._system === 'object' || object._system === undefined) &&
      (typeof object.userSelected === 'boolean' || object.userSelected === undefined) &&
      (typeof object._userSelected === 'object' || object._userSelected === undefined) &&
      (typeof object.version === 'string' || object.version === undefined) &&
      (typeof object._version === 'object' || object._version === undefined)
    )
  },
  CodeableConcept: (object: any): object is fhir4.CodeableConcept => {
    const keys = ['coding', 'text', '_text']
    return (
      object &&
      Object.keys(object).every(k => keys.includes(k)) &&
      (Array.isArray(object.coding) || object.coding === undefined) &&
      (typeof object.text === 'string' || object.text === undefined) &&
      (typeof object._text === 'object' || object._text === undefined) &&
      (object.coding === undefined || object.coding.every((c: any) => is.Coding(c)))
    )
  },
  Extension: (object: any): object is fhir4.Extension => {
    const keys = Object.keys(object)
    return (
      object &&
      (object.url && typeof object.url === 'string') &&
      ((keys.find(k => k.startsWith('value')) && keys.length == 2) || keys.length === 1)
    )
  },
  Expression: (object: any): object is fhir4.Expression => {
    const keys = [
      'description', '_description',
      'expression', '_expression',
      'language', '_language',
      'name', '_name',
      'reference', '_reference'
    ];
    return (
      object &&
      Object.keys(object).every(key => keys.includes(key)) &&
      (typeof object.description === 'string' || object.description === undefined) &&
      (typeof object._description === 'object' || object._description === undefined) &&
      (typeof object.name === 'string' || object.name === undefined) &&
      (typeof object._name === 'object' || object._name === undefined) &&
      (typeof object.language === 'string' || object.language === undefined) &&
      (typeof object._language === 'object' || object._language === undefined) &&
      (typeof object.expression === 'string' || object.expression === undefined) &&
      (typeof object._expression === 'object' || object._expression === undefined) &&
      (typeof object.reference === 'string' || object.reference === undefined) &&
      (typeof object._reference === 'object' || object._reference === undefined)
    )
  }
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

export const isMarkdown = (content: any) => {
  return /^[\s\S]+$/.test(content)
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
    return (
      <li key={c.code}>
        {formatCoding(c, resolver)}
      </li>
    )
  })
}

export const formatCoding = (  coding: fhir4.Coding,
  resolver?: FileResolver | BrowserResolver | undefined) => {
  const {system, code, display, version} = coding
  let systemDisplay
  if (system && resolver) {
    const resource = resolveCanonical(system, resolver)
    if (is.CodeSystem(resource)) {
      systemDisplay =
        formatTitle(resource)
    }
  }
  return (
    <>
      {code ? (
        <p>
          Coding: {code} from {systemDisplay ?? system}{version ? `|${version}` : ''}{display ? ` (${display})`: ''}
        </p>
      ) : undefined}
    </>
  )
}

export const formatMarkdown = (markdown: string) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
}

export const formatExtension = (extension: fhir4.Extension) => {
  const {url, valueUri, valueCode, valueCodeableConcept, valueCoding, valueUrl, valueBoolean, valueDateTime, valueMarkdown, valueCanonical} = extension
  const title = url.split("/").pop()
  let content
  if (valueUri || valueCode || valueUrl || valueBoolean || valueDateTime || valueCanonical) {
    content = valueUri || valueCode || valueUrl || valueBoolean || valueDateTime || valueCanonical
  } else if (valueCoding) {
    content = formatCoding(valueCoding)
  } else if (valueCodeableConcept) {
    content = formatCodeableConcept(valueCodeableConcept)
  } else if (valueMarkdown) {
    content = formatMarkdown(valueMarkdown)
  }
  return(
    <>
      {`${title}: ${content}`}
    </>
  )
}

export const formatExpression = (exp: fhir4.Expression) => {
  const {language, expression, reference} = exp
  return `${expression}${language ? ` as ${language}` : ''}${reference ? ` from ${reference}`: ''}`
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
        resourceDisplay = (
          <Link
            onClick={() => navigate(`/Library/${rawResource.id}`)}
            to={`/Library/${rawResource.id}`}
          >
            {formatTitle(rawResource)}
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

// This is just expressions
export const formatApplicabilities = (
  condition: fhir4.PlanDefinitionAction['condition']
) => {
  return condition?.map((c) => {
    return <li key={v4()}>{c.expression?.expression ?? null}</li>
  })
}

export const formatProperty = (value: any, key?: string) => {
  const meta = [
    'id',
    'version',
    'url',
    'publisher',
    'version',
    'title',
    'name',
    'status',
    'date',
    'resourceType',
    'experimental'
  ]
  if (!key || (key && !meta.includes(key))) {
    const keyDisplay = typeof key === 'string' ? key.charAt(0).toUpperCase() + key.slice(1) : undefined
    console.log(is.Expression(value))

    if (Array.isArray(value) && value.every(v => is.CodeableConcept(v))) {
      return value.map(v => <ListDisplayItem header={keyDisplay} content={formatCodeableConcept(v)} />)
    } else if (Array.isArray(value)) {
      return <ListDisplayItem header={keyDisplay} content={value.map((v) => {
        console.log(is.Expression(v))
        return <li key={v4()}>{formatProperty(v)}</li>
      })}/>
    } else {
      let content
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
        content = value.toString()
      } else if (is.Coding(value)) {
        content = formatCoding(value)
      } else if (is.Extension(value)) {
        content = formatExtension(value)
      } else if (is.Expression(value)) {
        content = formatExpression(value)
      }
      return content ? <SingleDisplayItem header={keyDisplay} content={content} /> : null
    }
  }
}
