export type FhirClientErrorType = 'network' | 'cors' | 'http' | 'parse'

export interface FhirClientError {
  message: string
  type: FhirClientErrorType
}

export type FhirClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FhirClientError }

/**
 * Minimal fetch wrapper for FHIR REST requests.
 *
 * Returns a discriminated-union result so callers can handle errors without
 * try/catch at the call site.
 *
 * @param baseUrl  Base URL of the FHIR server (e.g. "http://localhost:8080/fhir")
 * @param options  Request options: path and optional query params
 */
export async function fhirClient<T>(
  baseUrl: string,
  { path, params }: { path: string; params?: Record<string, string> }
): Promise<FhirClientResult<T>> {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  const url = new URL(normalizedPath, normalizedBase)

  if (params != null) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  let response: Response
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: 'application/fhir+json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const type: FhirClientErrorType = message
      .toLowerCase()
      .includes('failed to fetch')
      ? 'cors'
      : 'network'
    return { ok: false, error: { message, type } }
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        message: `HTTP ${response.status} ${response.statusText}`,
        type: 'http',
      },
    }
  }

  try {
    const data = (await response.json()) as T
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error: {
        message:
          err instanceof Error ? err.message : 'Failed to parse response',
        type: 'parse',
      },
    }
  }
}
