import cql, { Results } from 'cql-execution'
import cqlFhir from 'cql-exec-fhir'
import fhirpath from 'fhirpath'
import fhirpathR4Model from 'fhirpath/fhir-context/r4'
import lodashSet from 'lodash/set'
import FHIRHelpersLibrary from './support/Library-FHIRHelpers.json'

import {
  handleError,
  inspect,
  is,
  notEmpty,
  removeUndefinedProps,
  RequestResource
} from './helpers'
import { Resolver } from './resolver'

export const processDynamicValue = async (
  dynamicValue:
    | fhir4.ActivityDefinitionDynamicValue
    | fhir4.PlanDefinitionActionDynamicValue,
  definitionalResource: fhir4.PlanDefinition | fhir4.ActivityDefinition,
  targetResource: RequestResource | fhir4.Questionnaire,
  contentResolver: Resolver,
  terminologyResolver: Resolver,
  dataResolver?: Resolver | undefined,
  data?: fhir4.Bundle | undefined,
  libraries?: fhir4.Library[] | undefined,
  subject?: string | undefined,
  encounter?: string | undefined,
  practitioner?: string | undefined,
  organization?: string | undefined
): Promise<RequestResource | fhir4.Questionnaire> => {
  const { path, expression } = dynamicValue

  if (path == null || expression == null) {
    return targetResource
  }

  if (expression.language === 'text/fhirpath') {
    const subjectResource = resolveBundleOrEndpoint(subject, data, dataResolver)
    const encounterResource = resolveBundleOrEndpoint(
      encounter,
      data,
      dataResolver
    )
    const practitionerResource = resolveBundleOrEndpoint(
      practitioner,
      data,
      dataResolver
    )
    const organizationResource = resolveBundleOrEndpoint(
      organization,
      data,
      dataResolver
    )

    const result = evaluateFhirpath(
      expression.expression ?? '',
      definitionalResource,
      {
        subject: subjectResource,
        encounter: encounterResource,
        practitioner: practitionerResource,
        organization: organizationResource
      }
    )
    if (result.length > 1) {
      console.error(
        'DynamicValue got multiple results, expecting one...',
        inspect(expression),
        inspect(result)
      )
    }
    set(targetResource, path, result[0])
  } else if (expression.language === 'text/cql-identifier') {
    const dataContext = removeUndefinedProps(
      await buildDataContext(
        dataResolver,
        data,
        subject,
        encounter,
        practitioner,
        organization
      )
    )

    if (dataContext == null) {
      console.warn(
        `Can not process CQL without dataContext, skipping ${inspect(
          expression
        )}`
      )
      return targetResource
    }

    const inBundle = (
      entry: fhir4.BundleEntry,
      bundle: fhir4.Bundle
    ): boolean => {
      return (
        bundle.entry?.some((be) => {
          const { resource: entryResource } = entry
          const { resource: bundleResource } = be
          if (entryResource != null && bundleResource != null) {
            return (
              entryResource.id === bundleResource.id &&
              entryResource.resourceType === bundleResource.resourceType
            )
          }
          return false
        }) ?? false
      )
    }

    if (is.Bundle(dataContext) && is.Bundle(data) && data != null) {
      ;(dataContext.entry ||= [])?.push(
        ...(data.entry?.filter((e) => !inBundle(e, dataContext)) ?? [])
      )
    }

    const value = await evaluateCqlExpression(
      subject ?? '',
      expression,
      dataContext,
      contentResolver,
      terminologyResolver,
      dataResolver,
      libraries
    )
    set(targetResource, path, value)
  } else {
    console.warn(
      `Expression lanugage '${
        expression.language ?? '[none]'
      }' not supported, only support for: text/fhirpath, text/cql-identifier`
    )
  }
  return targetResource
}

const resolveBundleOrEndpoint = async (
  reference?: string | undefined,
  data?: fhir4.Bundle | undefined,
  dataResolver?: Resolver | undefined
): Promise<fhir4.FhirResource | undefined> => {
  if (reference == null) {
    return
  }

  let resource: fhir4.FhirResource | undefined

  if (data != null) {
    resource = data.entry
      ?.map((e) => e.resource)
      .find((r) => {
        const [resourceType, id] = reference.split('/')
        return r?.resourceType === resourceType && r?.id === id
      })
  }

  if (resource == null && dataResolver != null) {
    resource = await dataResolver.resolveReference(reference)
  }

  return resource
}
/**
 * Create a FHIR Bundle data context from references
 *
 * @param dataResolver FHIR Resource resolver for patiend data
 * @param data FHIR Data bundle for patient
 * @param initialContext Initial data context
 * @param subject subject reference
 * @param encounter encounter reference
 * @param practitioner practitioner reference
 * @param organization organization reference
 * @returns FHIR Bundle of initial context plus resolved references
 */
export const buildDataContext = async (
  dataResolver?: Resolver | undefined,
  data?: fhir4.Bundle | undefined,
  subject?: string | undefined,
  encounter?: string | undefined,
  practitioner?: string | undefined,
  organization?: string | undefined
): Promise<fhir4.Bundle> => {
  const context: fhir4.Bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: data != null ? data.entry : []
  }

  if (subject != null) {
    const patientResource = await resolveBundleOrEndpoint(
      subject,
      data,
      dataResolver
    )
    ;(context.entry ||= []).push({ resource: patientResource })
  }
  if (encounter != null) {
    const encounterResource = await resolveBundleOrEndpoint(
      encounter,
      data,
      dataResolver
    )
    ;(context.entry ||= []).push({ resource: encounterResource })
  }
  if (practitioner != null) {
    const practitionerResource = await resolveBundleOrEndpoint(
      practitioner,
      data,
      dataResolver
    )
    ;(context.entry ||= []).push({ resource: practitionerResource })
  }
  if (organization != null) {
    const organizationResource = await resolveBundleOrEndpoint(
      organization,
      data,
      dataResolver
    )
    ;(context.entry ||= []).push({ resource: organizationResource })
  }
  return context
}

/**
 * Evaluate FHIR Expression with text/cql-identifier
 *
 * @param expression FHIR Expression
 * @param dataContext Patient data bundle for evaluation
 * @param contentResolver Resolver for content
 * @param terminologyResolver Resolver for terminology
 * @param libraries Array of libraries to evaluate
 * @returns Array of Results
 */
export const evaluateCqlExpression = async (
  patientRef: string,
  expression: fhir4.Expression,
  dataContext: fhir4.Bundle,
  contentResolver: Resolver,
  terminologyResolver: Resolver,
  dataResolver?: Resolver | undefined,
  libraries?: fhir4.Library[] | undefined
): Promise<any> => {
  const patients = dataContext?.entry
    ?.filter((e) => is.Patient(e?.resource))
    .map((e) => e.resource)

  if (patients?.length !== 1) {
    throw new Error(
      `should be one and only one patient in dataContext, found ${
        patients?.length ?? 0
      } -- ${inspect(dataContext)}`
    )
  }

  const allLibraries = (await contentResolver.allByResourceType('Library'))
    ?.filter(is.Library)
    ?.filter((l) =>
      l.content?.some((c) => c.contentType === 'application/elm+json')
    )
  const libraryManager: Record<string, any> =
    allLibraries?.reduce((acc, library) => {
      const { content } = library
      if (library.name) {
        const elmEncoded = content?.find(
          (c) => c.contentType === 'application/elm+json'
        )
        const elmJson = Buffer.from(elmEncoded?.data ?? '', 'base64').toString(
          'utf-8'
        )
        const libraryObject = JSON.parse(elmJson)
        terminologyResolver.preloadValueSets(libraryObject)
        acc[library.name] = libraryObject
      }
      return acc
    }, {} as Record<string, any>) ?? {}

  if (libraryManager['FHIRHelpers'] == null) {
    if (is.Library(FHIRHelpersLibrary)) {
      const { content } = FHIRHelpersLibrary
      const elmEncoded = content?.find(
        (c) => c.contentType === 'application/elm+json'
      )
      const elmJson = Buffer.from(elmEncoded?.data ?? '', 'base64').toString(
        'utf-8'
      )
      const fhirHelpersElm = JSON.parse(elmJson)
      libraryManager['FHIRHelpers'] = fhirHelpersElm
    }
  }

  const patientKey = patients?.[0]?.id
  if (patientKey == null) {
    throw new Error('Could not find .id for patient in dataContext')
  }

  if (expression.language === 'text/cql-identifier') {
    const results: Results[] = []
    if (expression.reference != null) {
      const libraryResource = await contentResolver.resolveCanonical(
        expression.reference,
        ['Library']
      )
      if (is.Library(libraryResource)) {
        results.push(
          await evaluateCqlLibrary(
            patientRef,
            libraryResource,
            libraryManager,
            terminologyResolver,
            contentResolver,
            dataResolver,
            dataContext
          )
        )
      }
    } else {
      const libResults = await Promise.all(
        libraries
          ?.map(async (libraryResource) => {
            if (is.Library(libraryResource)) {
              return evaluateCqlLibrary(
                patientRef,
                libraryResource,
                libraryManager,
                terminologyResolver,
                contentResolver,
                dataResolver,
                dataContext
              )
            }
          })
          .filter(notEmpty) ?? []
      )
      if (libResults != null) {
        libResults.forEach((r) => {
          if (r != null) {
            results.push(r)
          }
        })
      }
    }

    // Find the value in the CQL results
    let value: any = null
    results.forEach((r) => {
      Object.keys(r?.patientResults?.[patientKey])?.forEach((pr) => {
        if (pr === expression.expression) {
          value = r.patientResults?.[patientKey]?.[pr]
        }
      })
    })
    return value
  } else {
    console.warn('Expression is not text/cql-identifier', expression.language)
  }
}

const getDataRequirements = async (
  elmLibrary: any,
  contentResolver: Resolver
): Promise<fhir4.DataRequirement[]> => {
  // get includes, get FHIR library.dataRequirement
  return await Promise.all(
    elmLibrary.library?.includes?.def?.map(async (def: any) => {
      const { path } = def
      const fhirLibrary = await contentResolver.resolveCanonical(
        path.replace(/\/([^\/]*)$/, '/Library/$1')
      )
      if (is.Library(fhirLibrary)) {
        const childElmEncoded = fhirLibrary?.content?.find(
          (c) => c.contentType === 'application/elm+json'
        )

        const childElmJson = Buffer.from(
          childElmEncoded?.data ?? '',
          'base64'
        ).toString('utf-8')

        const { dataRequirement } = fhirLibrary

        if (childElmJson != null) {
          const childDataRequirements = await getDataRequirements(
            childElmJson,
            contentResolver
          )
          dataRequirement?.push(...childDataRequirements)
        }
        return dataRequirement
      }
    }) ?? []
  )
}

/**
 * Evaluate a CQL Library with patient data
 *
 * @param library FHIR Library with encoded JSON ELM
 * @param dataContext Data context for evaluation
 * @returns Results object from cql-execution
 */
export const evaluateCqlLibrary = async (
  patientRef: string,
  library: fhir4.Library,
  libraryManager: Record<string, any>,
  terminologyResolver: Resolver,
  contentResolver: Resolver,
  dataResolver?: Resolver | undefined,
  dataContext?: fhir4.Bundle | undefined
): Promise<Results> => {
  dataContext ||= {
    resourceType: 'Bundle',
    type: 'collection'
  }

  const elmEncoded = library.content?.find(
    (c) => c.contentType === 'application/elm+json'
  )
  const patientSource = cqlFhir.PatientSource.FHIRv401()

  const isObject = (obj: any) => {
    return Object.prototype.toString.call(obj) === '[object Object]'
  }

  const isArray = (obj: any) => {
    return Object.prototype.toString.call(obj) === '[object Array]'
  }

  const isString = (obj: any): obj is string => {
    return (
      typeof obj === 'string' &&
      Object.prototype.toString.call(obj) === '[object String]'
    )
  }

  const replaceReferences = (obj: any) => {
    if (obj == null) { return obj }
    
    return Object.keys(obj).reduce((acc, key) => {
      let value = JSON.parse(JSON.stringify(obj[key]))

      if (isObject(obj[key])) {
        value = replaceReferences(obj[key])
      }

      if (isArray(obj[key])) {
        value = obj[key].map((v: any) => replaceReferences(v))
      }

      if (key === 'reference' && isString(obj[key])) {
        value = obj[key].match(/[^\/]*\/[^\/]*$/)?.[0]
      }

      if (value == null && obj[key] != null) {
        console.warn('When modifying the reference, getting null', obj[key])
      }

      acc[key] = value
      return acc
    }, {} as Record<string, any>)
  }

  try {
    const elmJson = Buffer.from(elmEncoded?.data ?? '', 'base64').toString(
      'utf-8'
    )
    const allDataRequirements = (
      await getDataRequirements(JSON.parse(elmJson), contentResolver)
    ).filter(notEmpty)

    if (dataResolver != null) {
      const requiredData = (
        await Promise.all(
          allDataRequirements.flat().map(async (dataRequirement) => {
            const { type } = dataRequirement
            if (type != null) {
              return (
                (await dataResolver.allByResourceType(type, patientRef)) ?? []
              )
            }
          })
        )
      )
        .flat()
        .filter(notEmpty)

      dataContext.entry?.push(
        ...requiredData.map((d) => {
          return { resource: d }
        })
      )
    }

    // clean data context, need to replace all properties where reference is to be just :resourceType/:id
    const cleanedDataContext = dataContext?.entry
      ?.map((entry) => entry.resource)
      ?.map((resource) => replaceReferences(resource))
      ?.filter(is.FhirResource)
      ?.map((resource) => {
        return { resource: resource }
      })

    dataContext.entry = cleanedDataContext

    const repository = new cql.Repository(libraryManager)
    const libraryElm = JSON.parse(elmJson)
    const lib = new cql.Library(libraryElm, repository)
    const executor = new cql.Executor(lib, terminologyResolver)
    if (is.Bundle(dataContext)) {
      patientSource.loadBundles([dataContext])
    }
    const cqlResults = executor.exec(patientSource)
    if (process.env.DEBUG != null) {
      console.info(cqlResults)
    }
    return cqlResults
  } catch (error) {
    handleError(`Problem evaluating ${library.url ?? library.id ?? 'Unknown'}`)
    handleError(error)
    const patientSourceFallback = cqlFhir.PatientSource.FHIRv401()
    return new cql.Executor({}).exec(patientSourceFallback)
  }
}

/**
 * Evaluate a FHIRPath expression
 *
 * @param fhirPathExpression Expression to evaluate
 * @param resourceObject Target object of evaluation
 * @param environment Key-value pairs of %variables for expression
 * @returns array of results
 */
export const evaluateFhirpath = (
  fhirPathExpression: string,
  resourceObject?: fhir4.FhirResource | {},
  environment?: Record<string, any> | undefined
): any[] => {
  return fhirpath.evaluate(
    resourceObject,
    fhirPathExpression,
    environment,
    fhirpathR4Model
  )
}

export const set = (obj: any, path: string, value: any): void => {
  if (
    path.includes('resolve()') ||
    path.includes('extension("') ||
    path.includes('ofType(')
  ) {
    console.error('resolve, extension, and ofType not supported', path)
  }

  lodashSet(obj, path, value)
}
