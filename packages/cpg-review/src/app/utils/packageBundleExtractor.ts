import BrowserResolver from 'resolver/browser'
import {
  renderPatientName,
  setPackageCatalog,
  PackagePatientSummary,
} from 'utils/recentPatientsStore'

export function extractBundlesFromResolver(
  localResolver: BrowserResolver | undefined
): PackagePatientSummary[] {
  const bundles: PackagePatientSummary[] = []

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
    const patientName = renderPatientName(patient.name)
    const bundleId = resource.id ?? 'unknown'

    bundles.push({
      source: 'package',
      resourceType: 'Bundle',
      id: bundleId,
      name: `${patientName || bundleId} [Bundle/${bundleId}]`,
      dob: patient.birthDate,
      gender: patient.gender,
      json: JSON.stringify(resource),
      resourceCount: resource.entry.length,
      resourceTypes,
      addedAt: new Date().toISOString(),
    })
  }

  return bundles
}

export function indexPackageBundles(bundles: PackagePatientSummary[]): number {
  setPackageCatalog(bundles)
  return bundles.length
}
