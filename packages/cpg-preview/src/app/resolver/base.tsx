export class BaseResolver {
  endpoint: fhir4.Endpoint

  constructor(endpoint: fhir4.Endpoint) {
    this.endpoint = endpoint
  }
}

export default BaseResolver
