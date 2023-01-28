import glob from 'fast-glob'
import fs from 'fs'
import { ValueSet } from 'cql-execution'
import { Resolver } from '../resolver'
import BaseResolver from './base'
import Cache from '../cache'
import { inspect, is, notEmpty } from '../helpers'

/**
 * A simple FileResolver implementing Resolver interface.
 */
class FileResolver extends BaseResolver implements Resolver {
  resourcesByCanonical: Record<string, fhir4.FhirResource> = {}
  resourcesByReference: Record<string, fhir4.FhirResource> = {}
  resourcesByResourceType: Record<string, fhir4.FhirResource[]> = {}

  constructor(endpoint: fhir4.Endpoint) {
    super(endpoint)

    if (endpoint.connectionType.code !== 'hl7-fhir-file') {
      throw new Error('Endpoint must have connectionType "hl7-fhir-file"')
    }

    if (!endpoint.address.startsWith('file://')) {
      throw new Error('Endpoint address must start with file://')
    }

    const fhirResourcePath = endpoint.address
    glob
      .sync(`${fhirResourcePath.slice(7)}/**/*.json`, {})
      .forEach((filename) => {
        try {
          const rawResource = JSON.parse(
            fs.readFileSync(filename, { encoding: 'utf8' }).toString()
          )
          if (rawResource.url != null && rawResource.resourceType != null) {
            this.resourcesByCanonical[rawResource.url] = rawResource
          }
          if (rawResource.resourceType != null) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            const key: string = `${rawResource?.resourceType?.toString()}/${rawResource?.id?.toString()}`
            this.resourcesByReference[key] = rawResource
            ;(this.resourcesByResourceType[rawResource?.resourceType] ||=
              []).push(rawResource)
          }
        } catch (error) {
          console.warn(`problem with ${filename}`)
          console.warn(error)
        }
      })
  }

  public async allByResourceType(resourceType: string, patient?: string | undefined) {
    return this.resourcesByResourceType[resourceType]
  }

  public async resolveCanonical(canonical: string | undefined) {
    return canonical != null ? this.resourcesByCanonical[canonical] : undefined
  }

  public async resolveReference(reference: string | undefined) {
    return reference != null ? this.resourcesByReference[reference] : undefined
  }

  /**
   * Cache valuesets from an array of libraries
   *
   * Need to build a data structure like this:
   * https://github.com/cqframework/cql-exec-vsac/blob/master/test/fixtures/valueset-db.json
   *
   * @param libraries elm library to process
   */
  public async preloadValueSets(elm: any | undefined): Promise<void> {
    if (Array.isArray(elm.library?.valueSets?.def)) {
      await Promise.all(
        Object.values(elm.library.valueSets.def).map(
          async (elmValueset: any) => {
            if (elmValueset) {
              const key = elmValueset.id
              let cached = Cache.getKey(key)

              if (cached == null) {
                let version = elmValueset.version

                const results = this.resourcesByResourceType['ValueSet']
                  .filter(is.ValueSet)
                  .filter(
                    (v) =>
                      v.url === key &&
                      (version != null ? v.version === version : true)
                  )

                cached = results.reduce((acc, vs) => {
                  const vsVersion = vs.version ?? version
                  if (vsVersion) {
                    const codes = vs.compose?.include
                      ?.flatMap((include) => {
                        return include.concept
                          ?.map((c) => {
                            return {
                              code: c.code,
                              system: include.system,
                              version: include.version
                            }
                          })
                          .filter(notEmpty)
                      })
                      .filter(notEmpty)
                    acc[vsVersion] = new ValueSet(key, vsVersion, codes)
                  }
                  return acc
                }, {} as Record<string, ValueSet>)
                Cache.setKey(key, cached)
              }
            }
          }
        )
      )
      Cache.save()
    }
  }
}

export default FileResolver
