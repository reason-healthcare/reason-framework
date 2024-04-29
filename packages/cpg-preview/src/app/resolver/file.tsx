import glob from 'fast-glob'
import fs from 'fs'
import { Resolver } from './resolver'
import BaseResolver from './base'

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

  public async allByResourceType(
    resourceType: string,
    patientRef?: string | undefined
  ) {
    const resources = this.resourcesByResourceType[resourceType]
    if (patientRef != null) {
      return resources?.filter((resource) => {
        const rawResource = JSON.parse(JSON.stringify(resource))
        const { subject, patient } = rawResource
        let shouldUse = true
        if (subject != null) {
          shouldUse = subject.reference === patientRef
        }
        if (patient != null) {
          shouldUse = patient.reference === patientRef
        }
        return shouldUse
      })
    } else {
      return resources.filter((r) => r != null)
    }
  }

  public async resolveCanonical(canonical: string | undefined) {
    canonical = canonical?.split('|').shift()
    return canonical != null ? this.resourcesByCanonical[canonical] : undefined
  }

  public async resolveReference(reference: string | undefined) {
    return reference != null ? this.resourcesByReference[reference] : undefined
  }
}

export default FileResolver
