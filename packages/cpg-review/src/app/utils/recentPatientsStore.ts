const MAX_PER_KEY = 10
const PACKAGE_KEY = 'cpg-review:recent-patients:package'
const PACKAGE_CATALOG_KEY = 'cpg-review:package-catalog'
const PATIENTS_PREFIX = 'cpg-review:recent-patients:'

function endpointKey(url: string): string {
  return `${PATIENTS_PREFIX}endpoint:${url}`
}

export interface BasePatientSummary {
  name: string
  dob: string | undefined
  gender: string | undefined
  /** Serialized FHIR payload. For endpoint patients: a Patient resource. For package patients: the full uploaded Bundle. */
  json: string
  addedAt: string
}

export interface EndpointPatientSummary extends BasePatientSummary {
  source: 'endpoint'
  resourceType: 'Patient'
  /** Patient.id */
  id: string
  endpointUrl: string
}

export interface PackagePatientSummary extends BasePatientSummary {
  source: 'package'
  resourceType: 'Bundle'
  /** Bundle.id — full reference reconstructable as `Bundle/${id}` */
  id: string
  resourceCount?: number
  resourceTypes?: string[]
}

export type PatientSummary = EndpointPatientSummary | PackagePatientSummary

/**
 * Extract the patient ID from a stored bundle JSON string.
 * Returns the id of the first Patient resource found in the bundle's entries.
 */
export function getPatientIdFromBundleJson(json: string): string | undefined {
  try {
    const bundle = JSON.parse(json) as fhir4.Bundle
    return bundle.entry?.find((e) => e.resource?.resourceType === 'Patient')
      ?.resource?.id
  } catch {
    return undefined
  }
}

function readKey(key: string): PatientSummary[] {
  try {
    const raw = JSON.parse(
      localStorage.getItem(key) ?? '[]'
    ) as Array<Partial<PatientSummary>>
    // Drop stale entries from before the discriminated-union refactor (missing resourceType)
    return raw.filter((p): p is PatientSummary => p.resourceType != null)
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
    summary.source === 'endpoint'
      ? endpointKey(summary.endpointUrl)
      : PACKAGE_KEY

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
export function setPackageCatalog(bundles: PackagePatientSummary[]): void {
  localStorage.setItem(PACKAGE_CATALOG_KEY, JSON.stringify(bundles))
}

/**
 * Return all entries in the package catalog (uploaded bundles), sorted newest first.
 */
export function getPackageCatalog(): PackagePatientSummary[] {
  try {
    const raw = JSON.parse(
      localStorage.getItem(PACKAGE_CATALOG_KEY) ?? '[]'
    ) as Array<Partial<PackagePatientSummary>>
    // Drop stale entries missing resourceType
    return raw.filter((p): p is PackagePatientSummary => p.resourceType != null)
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

/**
 * Build a PackagePatientSummary from a bundle, optional patient resource, and
 * raw data payload string. Used by both ApplyForm and SelectedPatientPreviewCard
 * to avoid parallel inline constructions.
 *
 * @param bundle       The FHIR Bundle being submitted / previewed
 * @param patient      Patient resource extracted from the bundle (may be undefined)
 * @param dataPayload  Raw JSON string of the full bundle (used as `json` field)
 * @param options.addedAt  ISO string for addedAt; defaults to now
 * @param options.patientId  Fallback patient ID when bundle.id and patient.id are absent
 */
export function makeBundlePatientSummary(
  bundle: fhir4.Bundle,
  patient: fhir4.Patient | undefined,
  dataPayload: string | undefined,
  options?: { addedAt?: string; patientId?: string }
): PackagePatientSummary {
  return {
    id: bundle.id ?? 'unknown',
    resourceType: 'Bundle',
    name: renderPatientName(patient?.name),
    dob: patient?.birthDate,
    gender: patient?.gender,
    source: 'package',
    json: typeof dataPayload === 'string' ? dataPayload : JSON.stringify(bundle),
    addedAt: options?.addedAt ?? new Date().toISOString(),
  }
}
