import {
  toServerReachableEndpointUrl,
  toUserFacingEndpointText,
} from '../../src/app/api/apply/endpointUrls'

describe('apply endpoint URL handling', () => {
  it('rewrites localhost HTTP endpoints to the configured Docker host', () => {
    expect(
      toServerReachableEndpointUrl(
        'http://localhost:8080/fhir/PlanDefinition/$r5.apply',
        'host.docker.internal'
      )
    ).toBe('http://host.docker.internal:8080/fhir/PlanDefinition/$r5.apply')
  })

  it('rewrites loopback endpoints to the configured Docker host', () => {
    expect(
      toServerReachableEndpointUrl(
        'http://127.0.0.1:8080/fhir',
        'host.docker.internal'
      )
    ).toBe('http://host.docker.internal:8080/fhir')
  })

  it('preserves user-facing localhost semantics outside Docker', () => {
    expect(toServerReachableEndpointUrl('http://localhost:8080/fhir', '')).toBe(
      'http://127.0.0.1:8080/fhir'
    )
  })

  it('does not rewrite non-local or non-http endpoints', () => {
    expect(
      toServerReachableEndpointUrl(
        'https://fhir.example.test/base',
        'host.docker.internal'
      )
    ).toBe('https://fhir.example.test/base')
    expect(
      toServerReachableEndpointUrl(
        'file:///tmp/fhir',
        'host.docker.internal'
      )
    ).toBe('file:///tmp/fhir')
  })

  it('masks Docker host internals before returning messages to users', () => {
    expect(
      toUserFacingEndpointText(
        'Unable to resolve http://host.docker.internal:8080/fhir/Patient',
        'host.docker.internal'
      )
    ).toBe('Unable to resolve http://localhost:8080/fhir/Patient')
  })
})
