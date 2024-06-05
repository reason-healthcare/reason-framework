import FileResolver from './file'

export interface Resolver {
  endpoint: fhir4.Endpoint

  resolveCanonical: (
    reference: string | undefined,
    resourceTypes?: string[] | undefined
  ) => Promise<fhir4.FhirResource | undefined>

  resolveReference: (
    reference: string | undefined
  ) => Promise<fhir4.FhirResource | undefined>

  allByResourceType: (
    resourceType: string,
    patientRef?: string | undefined
  ) => Promise<fhir4.FhirResource[] | undefined>
}

// TODO: add support for rest resolver

export default (endpoint: fhir4.Endpoint) => {
  if (endpoint.connectionType.code === 'hl7-fhir-file') {
    return new FileResolver(endpoint)
  } else {
    throw new Error(
      `Endpoint.connectionType must be 'hl7-fhir-rest' or 'hl7-fhir-file'.  ` +
        `Endpoint ${JSON.stringify(endpoint, null, 2)}`
    )
  }
}
