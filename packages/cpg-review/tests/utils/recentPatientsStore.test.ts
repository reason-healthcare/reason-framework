import {
  addPatient,
  getAllPatients,
  setPackageCatalog,
  getPackageCatalog,
  clearAll,
  PackagePatientSummary,
} from 'utils/recentPatientsStore'

const catalogEntry: PackagePatientSummary = {
  id: 'Cat1',
  resourceType: 'Bundle',
  name: 'Eve [Bundle/Cat1]',
  dob: undefined,
  gender: undefined,
  source: 'package',
  json: JSON.stringify({ resourceType: 'Bundle', type: 'collection' }),
  resourceCount: 1,
  resourceTypes: ['Patient'],
  addedAt: new Date().toISOString(),
}

describe('recentPatientsStore package persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists package patients under package key via addPatient', () => {
    addPatient({
      id: 'Test123',
      resourceType: 'Bundle',
      name: 'Alice [Bundle/Test123]',
      dob: undefined,
      gender: undefined,
      source: 'package',
      json: JSON.stringify({
        resourceType: 'Bundle',
        type: 'collection',
      }),
      resourceCount: 1,
      resourceTypes: ['Patient'],
      addedAt: new Date().toISOString(),
    })

    const raw = localStorage.getItem('cpg-review:recent-patients:package')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? '[]')
    expect(parsed[0]).toEqual(
      expect.objectContaining({
        source: 'package',
        resourceType: 'Bundle',
        id: 'Test123',
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
    expect(catalog[0].id).toBe('Cat1')

    // Catalog entries do NOT appear in getAllPatients
    const recents = getAllPatients()
    expect(recents.some((p) => p.id === 'Bundle/Cat1')).toBe(false)
  })

  it('clearAll removes catalog as well as recents', () => {
    setPackageCatalog([catalogEntry])
    addPatient({
      id: 'manual-1',
      resourceType: 'Bundle',
      name: 'Bob',
      dob: undefined,
      gender: undefined,
      source: 'package',
      json: '',
      addedAt: new Date().toISOString(),
    })

    clearAll()

    expect(getPackageCatalog()).toHaveLength(0)
    expect(getAllPatients()).toHaveLength(0)
  })
})
