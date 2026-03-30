import BrowserResolver from 'resolver/browser'
import { renderPatientName } from 'utils/recentPatientsStore'
import { setPackageCatalog, PatientSummary } from 'utils/recentPatientsStore'

export interface PackageBundleExtract {
  bundleId: string
  bundleReference: string
  bundleJson: string
  patientId: string
  patientName: string
  patientDob?: string
  patientGender?: string
  resourceCount: number
  resourceTypes: string[]
}

export function extractBundlesFromResolver(
  localResolver: BrowserResolver | undefined
): PackageBundleExtract[] {
  const bundles: PackageBundleExtract[] = []

  if (!localResolver) {
    return bundles
  }

  const references = Object.keys(localResolver.resourcesByReference)

  for (const reference of references) {
    const resource = localResolver.resourcesByReference[reference]
    if (resource?.resourceType !== 'Bundle' || !resource.entry?.length) continue

    const patient = resource.entry.find(
      (entry) => entry.resource?.resourceType === 'Patient'
    )?.resource as fhir4.Patient | undefined

    if (!patient) continue

    const resourceTypeSet = new Set<string>()
    resource.entry.forEach((entry) => {
      const type = entry.resource?.resourceType
      if (type) resourceTypeSet.add(type)
    })
    const resourceTypes = Array.from(resourceTypeSet)

    bundles.push({
      bundleId: resource.id ?? 'unknown',
      bundleReference: reference,
      bundleJson: JSON.stringify(resource),
      patientId: patient.id ?? 'unknown',
      patientName: renderPatientName(patient.name),
      patientDob: patient.birthDate,
      patientGender: patient.gender,
      resourceCount: resource.entry.length,
      resourceTypes,
    })
  }

  return bundles
}

export function indexPackageBundles(
  bundles: PackageBundleExtract[]
): number {
  const catalog: PatientSummary[] = bundles.map((bundle) => ({
    resourceType: 'Bundle',
    id: bundle.bundleReference,
    name: `${bundle.patientName || bundle.patientId} [${bundle.bundleReference}]`,
    dob: bundle.patientDob,
    gender: bundle.patientGender,
    source: 'package',
    bundleId: bundle.bundleId,
    bundleReference: bundle.bundleReference,
    bundleJson: bundle.bundleJson,
    resourceCount: bundle.resourceCount,
    resourceTypes: bundle.resourceTypes,
    patientId: bundle.patientId,
    addedAt: new Date().toISOString(),
  }))

  setPackageCatalog(catalog)
  return bundles.length
}
