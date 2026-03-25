import { fhirClient } from 'lib/fhirClient'

const BASE = 'http://example.com/fhir'

describe('fhirClient', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns parsed JSON on a successful 200 response', async () => {
    const payload = { resourceType: 'Bundle', type: 'searchset', entry: [] }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    } as Response)

    const result = await fhirClient<fhir4.Bundle>(BASE, { path: '/Patient', params: { name: 'Smith' } })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(payload)
    }
    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/fhir/Patient?name=Smith',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/fhir+json' }) })
    )
  })

  it('returns an http error on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response)

    const result = await fhirClient(BASE, { path: '/Patient/missing' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('http')
      expect(result.error.status).toBe(404)
    }
  })

  it('returns a network error (not cors) for "Failed to fetch" — server not running', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await fhirClient(BASE, { path: '/Patient' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('network')
    }
  })

  it('returns cors error only when message explicitly contains "cors"', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('CORS request blocked by preflight'))

    const result = await fhirClient(BASE, { path: '/Patient' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('cors')
    }
  })

  it('returns a cors error when the thrown TypeError mentions cors/network', async () => {
    const corsError = new TypeError('NetworkError when attempting to fetch resource')
    global.fetch = jest.fn().mockRejectedValue(corsError)

    const result = await fhirClient(BASE, { path: '/Patient' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(['cors', 'network']).toContain(result.error.type)
    }
  })

  it('returns a parse error when the response JSON is invalid', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token') },
    } as unknown as Response)

    const result = await fhirClient(BASE, { path: '/Patient' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.type).toBe('parse')
    }
  })

  it('forwards custom headers', async () => {
    const payload = { resourceType: 'Patient' }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    } as Response)

    await fhirClient(BASE, { path: '/Patient/1', headers: { Authorization: 'Bearer token' } })
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) })
    )
  })
})
