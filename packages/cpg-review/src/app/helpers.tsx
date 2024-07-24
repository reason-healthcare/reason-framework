import { Link, NavigateFunction, useNavigate } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import FileResolver from 'resolver/file'
import { v4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SingleDisplayItem from './components/SingleDisplayItem'
import ListDisplayItem from './components/ListDisplayItem'

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
    const keys = typeof object === 'object' ? Object.keys(object) : null
    return (
      typeof object === 'object' &&
      (object.url && typeof object.url === 'string') &&
      (keys?.find(k => k.startsWith('value')) && keys.length == 2)
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
  },
  Condition: (object: any): object is fhir4.PlanDefinitionActionCondition => {
    const keys = [
      'expression', 'kind', '_kind'
    ];
    return (
      object &&
      Object.keys(object).every(key => keys.includes(key)) &&
      (typeof object.kind === 'string' || object.kind === undefined) &&
      (typeof object._kind === 'object' || object._kind === undefined) &&
      (typeof object.expression === 'object' || object.expression === undefined)
    )
  },
  DataRequirement: (object: any): object is fhir4.DataRequirement => {
    const keys = [
      'codeFilter',
      'dateFilter',
      'limit',
      'mustSupport', '_mustSupport',
      'profile', '_profile',
      'sort',
      'subjectCodeableConcept',
      'subjectReference',
      'type', '_type'
    ];
    return (
      object &&
      Object.keys(object).every(key => keys.includes(key)) &&
      (Array.isArray(object.profile) && object.profile.every((p: any) => typeof p === 'string') || object.profile === undefined) &&
      (typeof object.type === 'string')
    )
  },
  RelatedArtifact: (object: any): object is fhir4.RelatedArtifact => {
    const keys = [
      'citation',
      '_citation',
      'display',
      '_display', 'document',
      'label', '_label',
      'resource',
      '_resource',
      'type',
      '_type', 'url', '_url'
    ];
      const types = ['documentation', 'justification', 'citation', 'predecessor', 'successor', 'derived-from', 'depends-on', 'composed-of']
    return (
      typeof object === 'object' &&
      Object.keys(object).every(key => keys.includes(key)) &&
      (typeof object.citation === 'string' || object.citation === undefined) &&
      (typeof object._citation === 'object' || object._citation === undefined) &&
      (typeof object.display === 'string' || object.display === undefined) &&
      (typeof object._display === 'object' || object._display === undefined) &&
      (typeof object.document === 'object' || object.document === undefined) &&
      (typeof object.label === 'string' || object.label === undefined) &&
      (typeof object._label === 'object' || object._label === undefined) &&
      (typeof object.resource === 'string' || object.resource === undefined) &&
      (typeof object._resource === 'object' || object._resource === undefined) &&
      (types.includes(object.type)) &&
      (typeof object._type === 'object' || object._type === undefined) &&
      (typeof object.url === 'string' || object.url === undefined) &&
      (typeof object._url === 'object' || object._url === undefined)
    )
  }
}

export const resolveCanonical = (
  canonical: string | undefined,
  resolver: BrowserResolver
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
  const regex = /^(?!https?:\/\/)(?=.*(^|\s)(#{1,6}\s|\*{1,2}[^*]+\*{1,2}|_[^_]+_|`[^`]+`|```[^```]+```|>\s|!\[.*\]\(.*\)|\[.*\]\(.*\)|\d+\.\s|\-|\+|\*|_|\|))[\s\S]+$/;
  return regex.test(content)
}

export const isPrimitive = (content: any) => {
  const types = ['string', 'number', 'bigint', 'boolean']
  if (typeof content === 'boolean') {
  }
  return types.includes(typeof content)
}

export const isUrl = (content: any) => {
  return typeof content === 'string' && (content.startsWith('http') || content.startsWith('https'))
}

export const capitalize = (string: any) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
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

export const formatResourceType = (
  resource:
    | fhir4.StructureDefinition
    | TerminologyArtifact
    | KnowledgeArtifact
    | fhir4.PlanDefinitionAction
) => {
  if (
    is.KnowledgeArtifact(resource) ||
    is.StructureDefinition(resource) ||
    is.TerminologyArtifact(resource)) {
    return resource.resourceType.split(/(?=[A-Z])/).join(' ')
  }
}

export const formatCodeableConcept = (
  codeableConcept: fhir4.CodeableConcept,
  resolver?: BrowserResolver | undefined
) => {
  const {coding, text} = codeableConcept
  if (coding?.length && coding.length >1) {
    return codeableConcept?.coding?.map((c: fhir4.Coding) => {
      return (
        <li key={c.code}>
          {formatCoding(c, resolver)}
        </li>
      )
    })
  } else if (coding) {
    return formatCoding(coding[0])
  }
}

export const formatCoding = (  coding: fhir4.Coding,
  resolver?: BrowserResolver | undefined) => {
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
      {code && system ? (
        <span>
          "{code}" from {systemDisplay ?? system}{version ? `|${version}` : ''}{display ? ` (${display})`: ''}
        </span>
      ): <span>{code}</span>}
    </>
  )
}

export const formatMarkdown = (markdown: string) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
}

export const formatExtension = (extension: fhir4.Extension) => {
  const { url } = extension
  const title = url.split("/").pop()
  const valueKey = Object.keys(extension).find(k => k.includes("value")) as keyof fhir4.Extension
  const value = valueKey ? extension[valueKey] : null
  if (value != null) {
    return(
      <>
        <span>{`${title}`}</span>: <span>{formatValue(value)}</span>
      </>
    )
  }
}

export const formatExpression = (exp: fhir4.Expression) => {
  const {language, expression, reference} = exp
  return `${expression}${language ? ` as ${language}` : ''}${reference ? ` from ${reference}`: ''}`
}

export const formatRelatedArtifact = (
  artifact: fhir4.RelatedArtifact,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  // return artifact.map((e: any) => {
    // let resourceDisplay
    // if (e.resource && resolver) {
    //   const rawResource = resolveCanonical(e.resource, resolver)
    //   if (is.Library(rawResource) && navigate) {
    //     resourceDisplay = (
    //       <Link
    //         onClick={() => navigate(`/Library/${rawResource.id}`)}
    //         to={`/Library/${rawResource.id}`}
    //       >
    //         {formatTitle(rawResource)}
    //       </Link>
    //     )
    //   }
    // }
    const {type, display, label, url, document, citation} = artifact
    return (
      // <li key={v4()}>
      <>
        {type && <span>{`${capitalize(type)}: `}</span>}
        {(display || label) && <span>{display ?? label}</span>}
        {citation && <span>{citation}</span>}
        {url && (
          <p>
            <Link to={url} target="blank">
              {url}
            </Link>
          </p>
        )}
        {document?.title && (
          <p>
            <Link to="">{document.title}</Link>
          </p>
        )}{' '}
        {/* {resourceDisplay} */}
      </>
       //{/* </li> */}
    )
  // })
}

export const formatUrl = (url: string) => {
  return(
    <Link to={url}>{url}</Link>
  )
}

// TODO format canonical, reference, trigger definition, quantity, duration, period, range, dosage

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

export const formatCondition = (
  condition: any
) => {
  const {kind, expression} = condition
  return <span>{`${expression ? formatExpression(expression) + ' ': ''}${kind ? `(${kind})`: ''}`}</span>
}

export const formatDataRequirement = (
  dataRequirement: fhir4.DataRequirement
) => {
  const {type, profile} = dataRequirement
  return <span>{`${profile ? profile + ' ': ''}${type ? `(${type})`: ''}`}</span>
}

export const formatValue = (value: any): JSX.Element | undefined => {
  let formattedValue
  if (isMarkdown(value)) {
    formattedValue = formatMarkdown(value.toString())
  } else if (isUrl(value)) {
    formattedValue = formatUrl(value)
  } else if (isPrimitive(value)) {
    formattedValue = value.toString()
  } else if (is.Coding(value)) {
    formattedValue = formatCoding(value)
  } else if (is.Extension(value)) {
    formattedValue = formatExtension(value)
  } else if (is.Expression(value)) {
    formattedValue = formatExpression(value)
  } else if (is.CodeableConcept(value)) {
    formattedValue = formatCodeableConcept(value)
  } else if (is.Condition(value)) {
    formattedValue = formatCondition(value)
  } else if (is.DataRequirement(value)) {
    formattedValue = formatDataRequirement(value)
  } else if (is.RelatedArtifact(value)) {
    formattedValue = formatRelatedArtifact(value)
  }
  return formattedValue
}

export const formatProperty = (value: any, heading?: string | undefined) => {
  let content
  if (heading === 'action') {
    content = formatActions(value)
  } else if (Array.isArray(value) && value.length > 1) {
    content = value.map((v) => {
      return <li key={v4()}>{formatValue(v)}</li>
    })
  } else {
    const singleValue = Array.isArray(value) ? value[0] : value
    content = formatValue(singleValue)
    if (content == null && typeof value === 'object') {
      content = Object.entries(singleValue).map((e: [string, any]) => {
        const [k, v] = e
        return formatProperty(v, k)
      })
      .filter(notEmpty)
    }
  }
  const headingFormatted = heading != null ? capitalize(heading) : undefined
  if (Array.isArray(content)) {
    return <ListDisplayItem heading={headingFormatted} content={content} />
  } else {
    return <SingleDisplayItem heading={headingFormatted} content={content} />
  }
}
