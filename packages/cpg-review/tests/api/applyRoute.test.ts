import { POST } from '../../src/app/api/apply/route'

const originalDockerHost = process.env.CPG_REVIEW_DOCKER_HOST_INTERNAL

const makeRequest = (overrides = {}) =>
  ({
    json: async () => ({
      dataPayload: undefined,
      subjectPayload: 'Patient/example',
      cpgEngineEndpointPayload:
        'http://localhost:8080/fhir/PlanDefinition/$r5.apply',
      contentEndpointPayload: 'http://localhost:8080/fhir',
      txEndpointPayload: 'http://127.0.0.1:8080/fhir',
      dataEndpointPayload: 'http://localhost:8080/fhir',
      planDefinition: {
        resourceType: 'PlanDefinition',
        status: 'active',
      },
      questionnaire: undefined,
      ...overrides,
    }),
  } as any)

describe('apply route endpoint translation', () => {
  beforeEach(() => {
    process.env.CPG_REVIEW_DOCKER_HOST_INTERNAL = 'host.docker.internal'
    global.fetch = jest.fn()
  })

  afterEach(() => {
    process.env.CPG_REVIEW_DOCKER_HOST_INTERNAL = originalDockerHost
    jest.restoreAllMocks()
  })

  it('uses Docker-reachable URLs for the engine fetch and embedded endpoint resources', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ resourceType: 'Bundle', type: 'collection' }))
    )

    await POST(makeRequest())

    expect(global.fetch).toHaveBeenCalledWith(
      'http://host.docker.internal:8080/fhir/PlanDefinition/$r5.apply',
      expect.objectContaining({ method: 'POST' })
    )

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    const endpointAddresses = body.parameter
      .filter((parameter: any) => parameter.resource?.resourceType === 'Endpoint')
      .map((parameter: any) => parameter.resource.address)

    expect(endpointAddresses).toEqual([
      'http://host.docker.internal:8080/fhir',
      'http://host.docker.internal:8080/fhir',
      'http://host.docker.internal:8080/fhir',
    ])
  })

  it('returns user-facing endpoint names in downstream error messages', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({
          issue: [
            {
              diagnostics:
                'Unable to resolve http://host.docker.internal:8080/fhir',
            },
          ],
        }),
        { status: 400 }
      )
    )

    const response = await POST(makeRequest())
    const json = await response.json()

    expect(json.message).toContain('http://localhost:8080/fhir')
    expect(json.message).not.toContain('host.docker.internal')
  })
})
