import { addPatient, getAllPatients, setPackageCatalog, getPackageCatalog, clearAll } from 'utils/recentPatientsStore'
import { PatientSummary } from 'utils/recentPatientsStore'

const catalogEntry: PatientSummary = {
  id: 'Bundle/Cat1',
  name: 'Eve [Bundle/Cat1]',
  dob: undefined,
  gender: undefined,
  source: 'package',
  bundleId: 'Cat1',
  bundleReference: 'Bundle/Cat1',
  bundleJson: JSON.stringify({ resourceType: 'Bundle', type: 'collection' }),
  resourceCount: 1,
  resourceTypes: ['Patient'],
  patientId: 'Patient/cat-1',
  addedAt: new Date().toISOString(),
}

describe('recentPatientsStore package persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists package patients under package key via addPatient', () => {
    addPatient({
      id: 'Bundle/Test123',
      name: 'Alice [Bundle/Test123]',
      dob: undefined,
      gender: undefined,
      source: 'package',
      bundleId: 'Test123',
      bundleReference: 'Bundle/Test123',
      bundleJson: JSON.stringify({ resourceType: 'Bundle', type: 'collection' }),
      resourceCount: 1,
      resourceTypes: ['Patient'],
      patientId: 'Patient/123',
      addedAt: new Date().toISOString(),
    })

    const raw = localStorage.getItem('cpg-review:recent-patients:package')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? '[]')
    expect(parsed[0]).toEqual(
      expect.objectContaining({
        source: 'package',
        id: 'Bundle/Test123',
        bundleId: 'Test123',
        bundleReference: 'Bundle/Test123',
      })
    )

    const all = getAllPatients()
    expect(all.some((patient) => patient.source === 'package')).toBe(true)
  })

  it('stores catalog entries separately from recents', () => {
    setPackageCatalog([catalogEntry])

    // Catalog is accessible via getPackageCatalog
    const catalog = getPackageCatalog()
    expect(catalog).toHaveLength(1)
    expect(catalog[0].bundleId).toBe('Cat1')

    // Catalog entries do NOT appear in getAllPatients
    const recents = getAllPatients()
    expect(recents.some((p) => p.id === 'Bundle/Cat1')).toBe(false)
  })

  it('clearAll removes catalog as well as recents', () => {
    setPackageCatalog([catalogEntry])
    addPatient({
      id: 'manual-1',
      name: 'Bob',
      dob: undefined,
      gender: undefined,
      source: 'package',
      addedAt: new Date().toISOString(),
    })

    clearAll()

    expect(getPackageCatalog()).toHaveLength(0)
    expect(getAllPatients()).toHaveLength(0)
  })
})
