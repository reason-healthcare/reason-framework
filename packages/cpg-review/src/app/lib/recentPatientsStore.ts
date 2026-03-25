export const RECENT_PATIENTS_MAX = 10

export type PatientSource = 'endpoint' | 'manual'

export interface PatientSummary {
  id: string
  name: string
  dob: string | undefined
  gender: string | undefined
  source: PatientSource
  /** Present when source === 'endpoint'. Derived from dataEndpoint.address. */
  endpointUrl?: string
  addedAt: string
}

const STORAGE_PREFIX = 'cpg-review:recent-patients'

export const MANUAL_KEY = `${STORAGE_PREFIX}:manual`

export function endpointKey(endpointUrl: string): string {
  return `${STORAGE_PREFIX}:endpoint:${endpointUrl}`
}

function storageKey(summary: PatientSummary): string {
  return summary.source === 'endpoint' && summary.endpointUrl
    ? endpointKey(summary.endpointUrl)
    : MANUAL_KEY
}

function readKey(key: string): PatientSummary[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw) as PatientSummary[]
  } catch {
    return []
  }
}

function writeKey(key: string, entries: PatientSummary[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(entries))
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

/** Add or refresh a patient in the recent list. Updates addedAt on re-selection. */
export function addPatient(summary: PatientSummary): void {
  const key = storageKey(summary)
  let entries = readKey(key).filter((e) => e.id !== summary.id)
  entries.unshift({ ...summary, addedAt: new Date().toISOString() })
  if (entries.length > RECENT_PATIENTS_MAX) {
    entries = entries.slice(0, RECENT_PATIENTS_MAX)
  }
  writeKey(key, entries)
}

/** Get entries for a specific storage key, sorted most-recent first. */
export function getPatients(key: string): PatientSummary[] {
  return readKey(key).sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  )
}

/**
 * Get all recent patients across endpoint and manual sources,
 * merged and sorted most-recent first.
 */
export function getAllPatients(endpointUrl?: string): PatientSummary[] {
  const endpointEntries = endpointUrl
    ? getPatients(endpointKey(endpointUrl))
    : []
  const manualEntries = getPatients(MANUAL_KEY)
  return [...endpointEntries, ...manualEntries].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  )
}

/** Remove all cpg-review recent patient entries from localStorage. */
export function clearAll(): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

/** Extract a displayable full name from a FHIR R4 HumanName array. */
export function renderPatientName(
  nameArray: fhir4.HumanName[] | undefined
): string {
  if (!nameArray?.length) return 'Unknown'
  const first = nameArray[0]
  const given = first.given?.join(' ') ?? ''
  const family = first.family ?? ''
  return [given, family].filter(Boolean).join(' ') || 'Unknown'
}
