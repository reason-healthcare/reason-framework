export interface FhirClientOptions {
  path: string
  params?: Record<string, string>
  /** Reserved for auth header injection (fhir-terminology-server-auth epic) */
  headers?: Record<string, string>
}

export interface FhirClientError {
  type: 'network' | 'cors' | 'http' | 'parse'
  status?: number
  message: string
}

export type FhirClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FhirClientError }

/**
 * Thin abstraction over fetch for FHIR server requests.
 *
 * All browser-side FHIR HTTP calls go through this module so that auth header
 * injection (fhir-terminology-server-auth epic) can be added in one place
 * without touching any component.
 */
export async function fhirClient<T = unknown>(
  endpointUrl: string,
  options: FhirClientOptions
): Promise<FhirClientResult<T>> {
  const base = endpointUrl.endsWith('/') ? endpointUrl : `${endpointUrl}/`
  const url = new URL(
    options.path.startsWith('/') ? options.path.slice(1) : options.path,
    base
  )

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/fhir+json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      let msg = `HTTP ${response.status}`
      try {
        const body = await response.json()
        const diagnostic = body?.issue?.[0]?.diagnostics
        if (typeof diagnostic === 'string') msg = diagnostic
      } catch {
        // ignore parse failure on error body
      }
      return { ok: false, error: { type: 'http', status: response.status, message: msg } }
    }

    let data: T
    try {
      data = (await response.json()) as T
    } catch {
      return {
        ok: false,
        error: { type: 'parse', message: 'Failed to parse server response as JSON' },
      }
    }
    return { ok: true, data }
  } catch (err) {
    const isTypeError = err instanceof TypeError
    const raw = isTypeError ? err.message : String(err)
    // Only classify as CORS when the message explicitly names cors.
    // "Failed to fetch" is ambiguous: it fires for both CORS blocks and
    // servers that are not running, so we treat it as a network error and
    // surface guidance for both cases in the UI.
    const isCors = isTypeError && raw.toLowerCase().includes('cors')

    return {
      ok: false,
      error: {
        type: isCors ? 'cors' : 'network',
        message: isCors
          ? 'Request blocked: the FHIR server may not allow requests from this origin (CORS). Check the server CORS configuration.'
          : `Network error: ${raw}`,
      },
    }
  }
}
