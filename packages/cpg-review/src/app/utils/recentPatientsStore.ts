const MAX_PER_KEY = 10
const MANUAL_KEY = 'cpg-review:recent-patients:manual'
const PATIENTS_PREFIX = 'cpg-review:recent-patients:'

function endpointKey(url: string): string {
  return `${PATIENTS_PREFIX}endpoint:${url}`
}

export interface PatientSummary {
  id: string
  name: string
  dob: string | undefined
  gender: string | undefined
  source: 'manual' | 'endpoint'
  endpointUrl?: string
  addedAt: string
}

function readKey(key: string): PatientSummary[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as PatientSummary[]
  } catch {
    return []
  }
}

function writeKey(key: string, patients: PatientSummary[]): void {
  localStorage.setItem(key, JSON.stringify(patients))
}

function allStorageKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(PATIENTS_PREFIX)) keys.push(k)
  }
  return keys
}

/**
 * Add (or update) a patient in the recent patients store.
 * Updates `addedAt` to the current time if the patient already exists.
 * Evicts the oldest entry when the key exceeds MAX_PER_KEY.
 */
export function addPatient(summary: PatientSummary): void {
  const key =
    summary.source === 'endpoint' && summary.endpointUrl != null
      ? endpointKey(summary.endpointUrl)
      : MANUAL_KEY

  const existing = readKey(key).filter((p) => p.id !== summary.id)
  const updated: PatientSummary[] = [
    { ...summary, addedAt: new Date().toISOString() },
    ...existing,
  ]
  writeKey(key, updated.slice(0, MAX_PER_KEY))
}

/**
 * Return all recent patients, sorted by most recently added first.
 *
 * @param endpointUrl  When provided, returns patients from that endpoint key
 *                     plus the manual key. When omitted, returns all keys.
 */
export function getAllPatients(endpointUrl?: string): PatientSummary[] {
  const keys =
    endpointUrl != null
      ? [MANUAL_KEY, endpointKey(endpointUrl)]
      : allStorageKeys()

  const all = keys.flatMap((k) => readKey(k))
  return all.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
}

/**
 * Clear all recent patient entries from localStorage.
 */
export function clearAll(): void {
  allStorageKeys().forEach((k) => localStorage.removeItem(k))
}

/**
 * Render a FHIR HumanName array to a display string.
 * Uses the first name entry; returns an empty string when names is empty.
 */
export function renderPatientName(
  names: fhir4.HumanName[] | undefined
): string {
  if (!names?.length) return ''
  const { given = [], family = '' } = names[0]
  return [...given, family].filter(Boolean).join(' ')
}
