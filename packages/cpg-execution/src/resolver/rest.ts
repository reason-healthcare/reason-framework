import Client from 'fhir-kit-client'
import { ValueSet } from 'cql-execution'
import Cache from '../cache'
import { Resolver } from '../resolver'
import BaseResolver from './base'
import { canonicalResources, inspect, is, notEmpty } from '../helpers'

class RestResolver extends BaseResolver implements Resolver {
  client: Client

  constructor(endpoint: fhir4.Endpoint) {
    super(endpoint)

    if (endpoint.connectionType.code !== 'hl7-fhir-rest') {
      throw new Error('Endpoint must have connectionType "hl7-fhir-rest"')
    }

    if (!endpoint.address.startsWith('http')) {
      throw new Error(
        `Endpoint address must start with 'http', got: '${endpoint.address}'`
      )
    }

    // Build FHIR Rest client
    const customHeaders = new Headers()
    endpoint.header?.forEach((h) => {
      const [key, value, ...rest] = h.split(' ', 2)
      if (rest != undefined) {
        console.warn(`header has more than one space ${h}, skipping header.`)
      } else {
        customHeaders.set(key, value)
      }
    })

    if (endpoint.address != null) {
      this.client = new Client({ baseUrl: endpoint.address, customHeaders })
    } else {
      throw new Error(`Endpoint does not specify an address.`)
    }
  }

  private canonicalSearchBundle(
    url: string,
    resourceTypes?: string[] | undefined,
    version?: string | undefined
  ): fhir4.Bundle & { type: 'batch' } {
    resourceTypes ||= canonicalResources
    const entry: fhir4.BundleEntry[] = resourceTypes.map((resourceType) => {
      return {
        request: {
          method: 'GET',
          url: `${resourceType}?url=${url}${
            version != null ? `&version=${version}` : ''
          }`
        }
      }
    })

    return {
      resourceType: 'Bundle',
      type: 'batch',
      entry
    }
  }

  // TODO: Deal with pagination
  public async allByResourceType(
    resourceType: string,
    patient?: string | undefined
  ) {
    const searchParams: any = { _count: 1000 }
    if (patient != null) {
      searchParams.patient = patient
    }
    const bundle = await this.client.search({
      resourceType,
      searchParams
    })
    if (is.Bundle(bundle)) {
      const resultResources = bundle.entry
        ?.map((entry) => entry.resource)
        .filter(is.FhirResource)

      // For simplifier...
      return resultResources?.filter((r) => {
        const patientReference = (r as any)?.patient?.reference
        if (patientReference) {
          return patientReference.endsWith(patient)
        }

        const subjectReference = (r as any)?.subject?.reference
        if (subjectReference) {
          return subjectReference.endsWith(patient)
        }
        return true
      })
    }
  }

  public async resolveCanonical(
    canonicalWithVersion: string | undefined,
    resourceTypes?: string[] | undefined,
    version?: string | undefined
  ) {
    const [canonical, versionPiped] = (canonicalWithVersion || '').split('|')

    if (version != null && versionPiped != null && version !== versionPiped) {
      throw new Error(
        `Canonical with version ${canonicalWithVersion} does not match version ${version}`
      )
    }
    const versionFormatted = version ?? versionPiped
    const canonicalWithVersionFormatted = `${canonical}|${versionFormatted}`

    const cached = Cache.getKey(
      `canonical-resource-${canonicalWithVersionFormatted}`
    )
    if (cached != null) {
      return cached
    }

    if (canonical != null) {
      let results
      let requestParams = `/?url=${canonical}`
      if (versionFormatted != null) {
        requestParams += `&version=${versionFormatted}`
      }
      if (process.env.CANONICAL_SEARCH_ROOT != null) {
        console.log('Running canonical root search...')
        try {
          results = await this.client.request(requestParams)
        } catch (e) {
          throw new Error(
            `Problem with canonical search ${inspect(e)} -- ${process.env}`
          )
        }
      } else {
        // Batch search
        try {
          results = await this.client.batch({
            body: this.canonicalSearchBundle(
              canonical,
              resourceTypes,
              versionFormatted
            ) as unknown as fhir4.FhirResource & {
              type: 'batch'
            } // TODO: Update FKC type here `fhir4.Bundle & { type: 'batch' }`
          })
        } catch (e) {
          throw new Error(`Problem with canonical search ${inspect(e)}`)
        }
      }

      // Unwrap bundle of bundles
      if (is.Bundle(results)) {
        let resources = []
        if (process.env.CANONICAL_SEARCH_ROOT != null) {
          resources =
            results.entry
              ?.map((e) => e.resource)
              .filter(is.FhirResource)
              .filter(notEmpty) ?? []
        } else {
          const bundles = results.entry
            ?.map((e) => e.resource)
            .filter(is.Bundle)
          resources =
            bundles
              ?.flatMap((bundle) => {
                return bundle.entry?.map((b) => b.resource)
              })
              .filter(notEmpty) ?? []
        }

        if (resources?.length <= 2) {
          //temp set to 2 to include operation outcome
          const result = resources[0]
          Cache.setKey(
            `canonical-resource-${canonicalWithVersionFormatted}`,
            result
          )
          Cache.save(true)
          return result
        } else {
          throw new Error(
            `Did not find one and only one resource for ${canonicalWithVersionFormatted}. Found: ` +
              `${JSON.stringify(resources)}`
          )
        }
      }
    }
    return undefined
  }

  public async resolveReference(reference: string | undefined) {
    if (reference != null) {
      try {
        const resource = await this.client.request(reference, { method: 'GET' })
        if (is.FhirResource(resource)) {
          return resource
        }
      } catch (e) {
        console.error(inspect(e))
      }
    }
    return undefined
  }

  /**
   * Cache valuesets from an array of libraries
   *
   * Need to build a data structure like this:
   * https://github.com/cqframework/cql-exec-vsac/blob/master/test/fixtures/valueset-db.json
   *
   * @param libraries elm library to process
   */
  public async preloadValueSets(elm: any): Promise<void> {
    if (Array.isArray(elm.library.valueSets?.def)) {
      await Promise.all(
        Object.values(elm.library.valueSets.def).map(
          async (elmValueset: any) => {
            if (elmValueset) {
              const key = elmValueset.id
              let cached = Cache.getKey(key)

              if (cached == null) {
                let version = elmValueset.version

                const searchParams: { url: string; version?: string } = {
                  url: key
                }
                if (version != null) {
                  searchParams.version = version
                }

                const results = await this.client.search({
                  resourceType: 'ValueSet',
                  searchParams
                })

                let remoteValueSets: fhir4.ValueSet[] = []
                if (is.Bundle(results)) {
                  remoteValueSets =
                    results.entry?.map((e) => e.resource).filter(is.ValueSet) ??
                    []
                  cached = remoteValueSets.reduce((acc, vs) => {
                    const vsVersion = vs.version ?? version
                    if (vsVersion) {
                      const codes =
                        vs.expansion?.contains?.map((c) => {
                          return {
                            code: c.code,
                            system: c.system,
                            version: c.version
                          }
                        }) ||
                        vs.compose?.include
                          ?.flatMap((include) => {
                            return include.concept
                              ?.map((c) => {
                                return {
                                  code: c.code,
                                  system: include.system,
                                  version: include.version
                                }
                              })
                              ?.filter((c) => c.code != null)
                          })
                          ?.filter((c) => c != null) ||
                        []
                      acc[vsVersion] = new ValueSet(key, vsVersion, codes)
                    }
                    return acc
                  }, {} as Record<string, ValueSet>)
                  Cache.setKey(key, cached)
                  Cache.save(true)
                } else {
                  console.info(`Could not find ValueSets for ${key}`)
                }
              } else {
                console.info(`Already have ValueSet ${key} in cache.`)
              }
            }
          }
        )
      )
    }
  }

  public async expandValueSet(valueSet: fhir4.ValueSet) {
    const cached = Cache.getKey(`vs-with-expansion-${valueSet.url}`)
    if (cached != null) {
      return cached
    }

    const body: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'valueSet',
          resource: valueSet
        }
      ]
    }
    let expansion: fhir4.ValueSet | undefined
    try {
      let result = await this.client.request(
        `${this.endpoint.address}/ValueSet/$expand`,
        {
          method: 'POST',
          options: { headers: { 'Content-Type': 'application/json' } },
          body: JSON.stringify(body)
        }
      )
      if (is.ValueSet(result)) {
        expansion = result
        Cache.setKey(`vs-with-expansion-${valueSet.url}`, expansion)
        Cache.save(true)
      }
    } catch (e) {
      console.log('Problem expanding valueset ' + valueSet.url)
    }
    return expansion
  }
}

export default RestResolver
