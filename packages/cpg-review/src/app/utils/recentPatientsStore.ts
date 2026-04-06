const MAX_PER_KEY = 10
const PACKAGE_KEY = 'cpg-review:recent-patients:package'
const PACKAGE_CATALOG_KEY = 'cpg-review:package-catalog'
const PATIENTS_PREFIX = 'cpg-review:recent-patients:'

function endpointKey(url: string): string {
  return `${PATIENTS_PREFIX}endpoint:${url}`
}

export interface PatientSummary {
  id: string
  name: string
  dob: string | undefined
  gender: string | undefined
  source: 'endpoint' | 'package'
  endpointUrl?: string
  bundleId?: string // Resource ID only (e.g., "123" from "Bundle/123")
  bundleReference?: string // Full FHIR reference (e.g., "Bundle/123") for resolver lookups
  bundleJson?: string
  resourceCount?: number
  resourceTypes?: string[]
  patientId?: string
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
  let key = PACKAGE_KEY
  if (summary.source === 'endpoint' && summary.endpointUrl != null) {
    key = endpointKey(summary.endpointUrl)
  }
  if (summary.source === 'package') {
    key = PACKAGE_KEY
  }

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
 *                     plus package selections. When omitted, returns all keys.
 */
export function getAllPatients(endpointUrl?: string): PatientSummary[] {
  const keys =
    endpointUrl != null
      ? [PACKAGE_KEY, endpointKey(endpointUrl)]
      : allStorageKeys()

  const all = keys.flatMap((k) => readKey(k))
  return all.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
}

/**
 * Clear all recent patient entries from localStorage.
 */
export function clearAll(): void {
  allStorageKeys().forEach((k) => localStorage.removeItem(k))
  localStorage.removeItem(PACKAGE_CATALOG_KEY)
}

/**
 * Replace the package catalog (all bundles available from the current upload).
 * This is the full index written at upload time; it is NOT included in
 * getAllPatients() — only explicitly selected bundles go to PACKAGE_KEY.
 */
export function setPackageCatalog(bundles: PatientSummary[]): void {
  localStorage.setItem(PACKAGE_CATALOG_KEY, JSON.stringify(bundles))
}

/**
 * Return all entries in the package catalog (uploaded bundles), sorted newest first.
 */
export function getPackageCatalog(): PatientSummary[] {
  try {
    return JSON.parse(
      localStorage.getItem(PACKAGE_CATALOG_KEY) ?? '[]'
    ) as PatientSummary[]
  } catch {
    return []
  }
}

/**
 * Remove the package catalog from localStorage.
 */
export function clearPackageCatalog(): void {
  localStorage.removeItem(PACKAGE_CATALOG_KEY)
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
