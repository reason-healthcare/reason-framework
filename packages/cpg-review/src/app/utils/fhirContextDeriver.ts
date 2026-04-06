/**
 * Pure FHIR bundle traversal and context derivation utilities.
 *
 * This module is free of React dependencies — safe to import from any module,
 * test, or server-side context. All functions are stateless and side-effect-free.
 *
 * Typical usage:
 *   1. Parse a raw payload with `parseBundle`
 *   2. Construct a `ResourceIdentifier` with the patient's resource type and ID
 *   3. Call `deriveContext(bundle, subject)` to extract typed clinical resources scoped to that subject
 *   4. Use helpers like `mrnValue`, `formatAddress` to format patient data for display
 */

/**
 * Structured clinical context extracted from a FHIR bundle for a specific patient subject.
 * Produced by `deriveContext`.
 */
export interface DerivedContext {
  /** The Patient resource matching the subject reference, or undefined if not found. */
  patient: fhir4.Patient | undefined
  /** MedicationRequest and MedicationStatement resources whose subject matches the patient. */
  medications: Array<fhir4.MedicationRequest | fhir4.MedicationStatement>
  /** Condition resources whose subject matches the patient. */
  conditions: fhir4.Condition[]
  /** Observation resources whose subject matches the patient. */
  observations: fhir4.Observation[]
}

/**
 * Typed identity for a FHIR resource, combining resource type and logical ID.
 *
 * Used as the canonical patient subject throughout context derivation so that
 * reference strings (e.g. `Patient/Patient1`) are constructed internally rather
 * than parsed or assembled at every call site.
 */
export interface ResourceIdentifier {
  /** The FHIR resource type, e.g. `'Patient'`. */
  resourceType: string
  /** The logical resource ID, e.g. `'Patient1'`. */
  id: string
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Attempts to parse an unknown value into a `fhir4.Bundle`.
 *
 * Handles three input shapes:
 * - An already-parsed object with `resourceType: 'Bundle'`
 * - A JSON string containing a Bundle
 * - Anything else returns `undefined`
 *
 * @param dataPayload - Raw payload from user input, localStorage, or form state.
 * @returns A typed `fhir4.Bundle` if the input is or parses to one, otherwise `undefined`.
 */
export function parseBundle(dataPayload: unknown): fhir4.Bundle | undefined {
  if (dataPayload == null) return undefined
  if (typeof dataPayload === 'object') {
    const parsed = dataPayload as Partial<fhir4.Bundle>
    return parsed.resourceType === 'Bundle'
      ? (parsed as fhir4.Bundle)
      : undefined
  }
  if (typeof dataPayload !== 'string' || !dataPayload.trim()) return undefined
  try {
    const parsed = JSON.parse(dataPayload) as fhir4.Bundle
    return parsed.resourceType === 'Bundle' ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Loosely parses a value to its JSON-decoded form.
 *
 * - If `dataPayload` is already an object, it is returned as-is.
 * - If it is a non-empty string, it is parsed with `JSON.parse`.
 * - Null/undefined/empty string returns `undefined`.
 * - If parsing fails, the original string is returned unchanged.
 *
 * Useful when you want the raw structure without needing it to be a specific FHIR type.
 *
 * @param dataPayload - Value to decode.
 * @returns The decoded value, the original string on parse failure, or `undefined`.
 */
export function parseRawJson(dataPayload: unknown): unknown {
  if (dataPayload == null) return undefined
  if (typeof dataPayload !== 'string') return dataPayload
  if (!dataPayload.trim()) return undefined
  try {
    return JSON.parse(dataPayload)
  } catch {
    return dataPayload
  }
}

// ---------------------------------------------------------------------------
// Patient identifier helpers
// ---------------------------------------------------------------------------

/**
 * Maps a FHIR `Identifier.use` code to a numeric sort priority.
 *
 * Lower values are preferred when selecting among multiple identifiers of the same type.
 * Priority: `usual` (0) > `official` (1) > `secondary` (2) > anything else (3).
 *
 * @param use - The FHIR `Identifier.use` value, or `undefined`.
 * @returns A numeric priority where 0 is highest priority.
 */
export function normalizeIdentifierUse(
  use: fhir4.Identifier['use'] | undefined
): number {
  if (use === 'usual') return 0
  if (use === 'official') return 1
  if (use === 'secondary') return 2
  return 3
}

/**
 * Determines whether a FHIR `Identifier` represents a Medical Record Number (MRN).
 *
 * Checks multiple sources of evidence in priority order:
 * 1. HL7 v2 table 0203 coding (`system` = HL7 v2-0203, `code` = 'mr')
 * 2. Any coding with `code` or `display` matching 'mr', 'mrn', or 'medical record'
 * 3. `type.text` containing 'medical record' or 'mrn'
 * 4. `system` URL containing 'mrn'
 *
 * All comparisons are case-insensitive.
 *
 * @param identifier - The FHIR Identifier to evaluate.
 * @returns `true` if the identifier represents an MRN, otherwise `false`.
 */
export function isMrnIdentifier(identifier: fhir4.Identifier): boolean {
  const typeText = identifier.type?.text?.toLowerCase()
  const systemText = identifier.system?.toLowerCase()

  const codingMatches =
    identifier.type?.coding?.some((coding) => {
      const system = coding.system?.toLowerCase()
      const code = coding.code?.toLowerCase()
      const display = coding.display?.toLowerCase()

      const isV2MrCode =
        system === 'http://terminology.hl7.org/codesystem/v2-0203' &&
        code === 'mr'

      return (
        isV2MrCode ||
        code === 'mr' ||
        code === 'mrn' ||
        display?.includes('medical record') === true ||
        display?.includes('mrn') === true
      )
    }) ?? false

  return (
    codingMatches ||
    typeText?.includes('medical record') === true ||
    typeText?.includes('mrn') === true ||
    systemText?.includes('mrn') === true
  )
}

/**
 * Extracts the best available Medical Record Number (MRN) value from a patient resource.
 *
 * Filters the patient's identifiers to those recognized as MRNs by `isMrnIdentifier`,
 * then sorts them by use-priority (`usual` before `official`, etc.) and returns the
 * value of the highest-priority match.
 *
 * @param patient - The FHIR Patient resource to inspect, or `undefined`.
 * @returns The MRN string if found, or `'—'` if none exists.
 */
export function mrnValue(patient: fhir4.Patient | undefined): string {
  const identifiers = patient?.identifier ?? []

  const mrnIdentifiers = identifiers
    .filter((identifier) => !!identifier.value && isMrnIdentifier(identifier))
    .sort(
      (left, right) =>
        normalizeIdentifierUse(left.use) - normalizeIdentifierUse(right.use)
    )

  const identifier = mrnIdentifiers[0]
  return identifier?.value || '—'
}

/**
 * Formats a patient's address as a human-readable string.
 *
 * Address selection preference: `home` > `temp` > first available.
 * If the address has a pre-formatted `text` field, it is used directly.
 * Otherwise the address is assembled from structured fields:
 * line, city/district/state, postalCode, country.
 *
 * @param patient - The FHIR Patient resource to extract an address from.
 * @returns A formatted address string, or `'—'` if no address is available.
 */
export function formatAddress(patient: fhir4.Patient | undefined): string {
  const addresses = patient?.address ?? []
  const address =
    addresses.find((entry) => entry.use === 'home') ??
    addresses.find((entry) => entry.use === 'temp') ??
    addresses[0]

  if (!address) return '—'
  if (address.text?.trim()) return address.text.trim()

  const line = address.line?.filter(Boolean).join(', ')
  const locality = [address.city, address.district, address.state]
    .filter(Boolean)
    .join(', ')
  const postalAndCountry = [address.postalCode, address.country]
    .filter(Boolean)
    .join(' ')

  return [line, locality, postalAndCountry].filter(Boolean).join(', ') || '—'
}

// ---------------------------------------------------------------------------
// Reference resolution helpers
// ---------------------------------------------------------------------------

/**
 * Removes the FHIR `/_history/<version>` suffix from a reference string.
 *
 * Ensures that version-specific references (e.g. `Patient/123/_history/2`) are
 * treated as equivalent to their canonical form (`Patient/123`) during matching.
 *
 * @param reference - A FHIR reference string, possibly including a history suffix.
 * @returns The reference string with any history segment removed.
 */
export function stripHistorySuffix(reference: string): string {
  return reference.replace(/\/_history\/[^/]+$/, '')
}

/**
 * Expands a FHIR reference into all equivalent alias forms that could identify
 * the same resource, enabling flexible matching across different reference styles.
 *
 * For a relative reference like `Patient/123` the set includes:
 *   - `'Patient/123'` (typed relative)
 *   - `'123'` (bare ID)
 *
 * For an absolute URL like `http://example.org/fhir/Patient/123` the set adds:
 *   - `'Patient/123'`
 *   - `'123'`
 *
 * History suffixes are stripped from all forms before alias generation.
 *
 * @param reference - Any FHIR reference string (absolute URL, relative, or bare ID).
 * @returns An array of unique alias strings. Empty array if input is absent or blank.
 */
export function referenceAliases(reference: string | undefined): string[] {
  if (!reference?.trim()) return []

  const raw = stripHistorySuffix(reference.trim())
  const aliases = new Set<string>([raw])

  const relativeMatch = raw.match(/^([A-Za-z]+)\/([^/]+)$/)
  if (relativeMatch) {
    aliases.add(`${relativeMatch[1]}/${relativeMatch[2]}`)
    aliases.add(relativeMatch[2])
  }

  const patientAbsoluteMatch = raw.match(/\/Patient\/([^/?#]+)/)
  if (patientAbsoluteMatch) {
    aliases.add(`Patient/${patientAbsoluteMatch[1]}`)
    aliases.add(patientAbsoluteMatch[1])
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw)
      const trimmedPath = stripHistorySuffix(parsed.pathname)
      const pathParts = trimmedPath.split('/').filter(Boolean)
      if (pathParts.length >= 2) {
        const resourceType = pathParts[pathParts.length - 2]
        const resourceId = pathParts[pathParts.length - 1]
        aliases.add(`${resourceType}/${resourceId}`)
        aliases.add(resourceId)
      }
    } catch {
      // ignore invalid URL formatting
    }
  }

  return Array.from(aliases)
}

/**
 * Builds a complete set of all reference strings that could be used to refer to a
 * specific patient within a FHIR bundle.
 *
 * Combines aliases from two authoritative sources:
 * 1. The reference constructed from `subject` (e.g. `'Patient/Patient1'` and its aliases)
 * 2. The matching Patient entry's own `resource.id` and `fullUrl` within the bundle
 *
 * The resulting set is used with `matchesSubjectReference` to determine whether
 * clinical resources belong to the patient without requiring exact reference equality.
 *
 * @param subject - Typed patient identity with `resourceType` and `id`.
 * @param entries - Bundle entries (with non-null resources) to search for the Patient resource.
 * @returns A `Set<string>` of all known aliases for the patient.
 */
export function buildPatientReferenceSet(
  subject: ResourceIdentifier,
  entries: fhir4.BundleEntry[]
): Set<string> {
  const patientReferenceSet = new Set<string>()
  const subjectRef = `${subject.resourceType}/${subject.id}`

  for (const alias of referenceAliases(subjectRef)) {
    patientReferenceSet.add(alias)
  }

  const patientEntry = entries.find((entry) => {
    if (entry.resource?.resourceType !== 'Patient') return false
    const id = entry.resource.id
    if (id === subject.id) return true
    return referenceAliases(subjectRef).some((alias) =>
      referenceAliases(entry.fullUrl ?? '').includes(alias)
    )
  })

  if (patientEntry?.resource?.id) {
    for (const alias of referenceAliases(
      `${patientEntry.resource.resourceType}/${patientEntry.resource.id}`
    )) {
      patientReferenceSet.add(alias)
    }
  }

  if (patientEntry?.fullUrl) {
    for (const alias of referenceAliases(patientEntry.fullUrl)) {
      patientReferenceSet.add(alias)
    }
  }

  return patientReferenceSet
}

/**
 * Checks whether a FHIR `Reference` points to a patient represented in the given set.
 *
 * Expands the reference into all its aliases via `referenceAliases` and tests whether
 * any alias exists in `patientReferenceSet`. This tolerates mismatches between absolute
 * URLs, typed relative references (`Patient/id`), and bare IDs.
 *
 * @param reference - The `subject` or `patient` reference from a clinical resource.
 * @param patientReferenceSet - The set produced by `buildPatientReferenceSet`.
 * @returns `true` if the reference resolves to the patient, otherwise `false`.
 */
export function matchesSubjectReference(
  reference: fhir4.Reference | undefined,
  patientReferenceSet: Set<string>
): boolean {
  return referenceAliases(reference?.reference).some((alias) =>
    patientReferenceSet.has(alias)
  )
}

// ---------------------------------------------------------------------------
// Context derivation
// ---------------------------------------------------------------------------

/**
 * Derives structured clinical context from a FHIR bundle, scoped to a specific patient.
 *
 * This is the primary entry point for the module. It:
 * 1. Normalizes bundle entries, filtering out those without a resource.
 * 2. Builds a complete patient reference set using `buildPatientReferenceSet`.
 * 3. Locates the Patient resource whose `id` matches `subject.id`.
 * 4. Filters MedicationRequest, MedicationStatement, Condition, and Observation resources
 *    to only those whose `subject` reference resolves to the target patient.
 *
 * @param bundle - The FHIR Bundle to traverse, or `undefined`.
 * @param subject - Typed patient identity. The reference string is constructed internally
 *   as `\`${subject.resourceType}/${subject.id}\`` — no string parsing needed at call sites.
 * @returns A `DerivedContext` object with typed, patient-scoped clinical resources.
 */
export function deriveContext(
  bundle: fhir4.Bundle | undefined,
  subject: ResourceIdentifier
): DerivedContext {
  const entries: fhir4.BundleEntry[] =
    bundle?.entry
      ?.filter(
        (
          entry
        ): entry is {
          fullUrl?: string
          resource: fhir4.FhirResource
        } => entry.resource != null
      )
      .map((entry) => ({
        fullUrl: entry.fullUrl,
        resource: entry.resource,
      })) ?? []

  const resources = entries.map((entry) => entry.resource)
  const patientReferenceSet = buildPatientReferenceSet(subject, entries)

  const patient = resources.find(
    (resource): resource is fhir4.Patient =>
      resource?.resourceType === 'Patient' && resource.id === subject.id
  )

  const medications = resources.filter(
    (
      resource
    ): resource is fhir4.MedicationRequest | fhir4.MedicationStatement => {
      if (resource?.resourceType === 'MedicationRequest') {
        return matchesSubjectReference(resource.subject, patientReferenceSet)
      }
      if (resource?.resourceType === 'MedicationStatement') {
        return matchesSubjectReference(resource.subject, patientReferenceSet)
      }
      return false
    }
  )

  const conditions = resources.filter(
    (resource): resource is fhir4.Condition =>
      resource?.resourceType === 'Condition' &&
      matchesSubjectReference(resource.subject, patientReferenceSet)
  )

  const observations = resources.filter(
    (resource): resource is fhir4.Observation =>
      resource?.resourceType === 'Observation' &&
      matchesSubjectReference(resource.subject, patientReferenceSet)
  )

  return {
    patient,
    medications,
    conditions,
    observations,
  }
}
