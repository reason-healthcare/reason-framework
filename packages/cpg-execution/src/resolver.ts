import RestResolver from './resolver/rest'
import FileResolver from './resolver/file'
import { ValueSet } from 'cql-execution'

export interface Resolver {
  endpoint: fhir4.Endpoint

  resolveCanonical: (
    reference: string | undefined,
    resourceTypes?: string[] | undefined,
    version?: string | undefined,
  ) => Promise<fhir4.FhirResource | undefined>

  resolveReference: (
    reference: string | undefined
  ) => Promise<fhir4.FhirResource | undefined>

  allByResourceType: (
    resourceType: string,
    patientRef?: string | undefined
  ) => Promise<fhir4.FhirResource[] | undefined>

  /**
   * Given ELM library, load and cache valuesets for processing.
   *
   * @async
   * @param elm to process
   * @returns void
   */
  preloadValueSets: (elm: any) => Promise<void>

  findValueSetsByOid: (oid: string) => ValueSet[] | undefined

  findValueSets: (oid: string, version?: string | undefined) => ValueSet[]

  findValueSet: (oid: string, version?: string) => ValueSet | undefined
}

export default (endpoint: fhir4.Endpoint) => {
  if (endpoint.connectionType.code === 'hl7-fhir-rest') {
    return new RestResolver(endpoint)
  } else if (endpoint.connectionType.code === 'hl7-fhir-file') {
    return new FileResolver(endpoint)
  } else {
    throw new Error(
      `Endpoint.connectionType must be 'hl7-fhir-rest' or 'hl7-fhir-file'.  ` +
        `Endpoint ${JSON.stringify(endpoint, null, 2)}`
    )
  }
}
