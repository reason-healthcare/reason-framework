import {
  addPatient,
  getPatients,
  getAllPatients,
  clearAll,
  RECENT_PATIENTS_MAX,
  endpointKey,
  MANUAL_KEY,
  PatientSummary,
} from 'lib/recentPatientsStore'

function makeSummary(overrides: Partial<PatientSummary> = {}): PatientSummary {
  return {
    id: 'p1',
    name: 'Jane Smith',
    dob: '1990-01-01',
    gender: 'female',
    source: 'manual',
    addedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('recentPatientsStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('addPatient / getPatients', () => {
    it('stores a new patient under the manual key', () => {
      const p = makeSummary()
      addPatient(p)
      const results = getPatients(MANUAL_KEY)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('p1')
    })

    it('stores an endpoint patient under the scoped key', () => {
      const p = makeSummary({ source: 'endpoint', endpointUrl: 'http://fhir.example.com/fhir' })
      addPatient(p)
      const key = endpointKey('http://fhir.example.com/fhir')
      const results = getPatients(key)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('p1')
    })

    it('returns empty array when no patients exist', () => {
      expect(getPatients(MANUAL_KEY)).toEqual([])
    })
  })

  describe('LRU eviction', () => {
    it(`evicts the oldest entry when cap of ${RECENT_PATIENTS_MAX} is exceeded`, () => {
      const base = new Date('2024-01-01').getTime()
      for (let i = 0; i < RECENT_PATIENTS_MAX; i++) {
        addPatient(
          makeSummary({
            id: `p${i}`,
            addedAt: new Date(base + i * 1000).toISOString(),
          })
        )
      }
      // Now add one more — p0 (oldest) should be evicted
      addPatient(
        makeSummary({
          id: `p${RECENT_PATIENTS_MAX}`,
          addedAt: new Date(base + RECENT_PATIENTS_MAX * 1000).toISOString(),
        })
      )
      const results = getPatients(MANUAL_KEY)
      expect(results).toHaveLength(RECENT_PATIENTS_MAX)
      expect(results.map((r) => r.id)).not.toContain('p0')
      expect(results.map((r) => r.id)).toContain(`p${RECENT_PATIENTS_MAX}`)
    })
  })

  describe('re-selection addedAt update', () => {
    it('moves an existing entry to the top when re-selected', async () => {
      const old = makeSummary({ id: 'p1', addedAt: '2024-01-01T00:00:00.000Z' })
      addPatient(old)
      const newer = makeSummary({ id: 'p2', addedAt: '2024-06-01T00:00:00.000Z' })
      addPatient(newer)

      // Re-add p1 with a fresh timestamp
      addPatient(makeSummary({ id: 'p1', addedAt: new Date().toISOString() }))

      const results = getPatients(MANUAL_KEY)
      expect(results[0].id).toBe('p1')
    })
  })

  describe('clearAll', () => {
    it('removes all cpg-review:recent-patients:* keys', () => {
      addPatient(makeSummary({ id: 'a', source: 'manual' }))
      addPatient(
        makeSummary({ id: 'b', source: 'endpoint', endpointUrl: 'http://fhir.test/fhir' })
      )

      clearAll()

      expect(getPatients(MANUAL_KEY)).toEqual([])
      expect(getPatients(endpointKey('http://fhir.test/fhir'))).toEqual([])
    })

    it('does not remove unrelated localStorage keys', () => {
      localStorage.setItem('other-key', 'value')
      addPatient(makeSummary())
      clearAll()
      expect(localStorage.getItem('other-key')).toBe('value')
    })
  })

  describe('getAllPatients', () => {
    it('returns merged list from endpoint and manual keys, newest first', () => {
      const url = 'http://fhir.example.com/fhir'
      addPatient(
        makeSummary({ id: 'manual1', source: 'manual', addedAt: '2024-01-01T00:00:00.000Z' })
      )
      addPatient(
        makeSummary({
          id: 'ep1',
          source: 'endpoint',
          endpointUrl: url,
          addedAt: '2024-06-01T00:00:00.000Z',
        })
      )

      const results = getAllPatients(url)
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('ep1') // newer first
    })

    it('returns only manual entries when no endpoint url provided', () => {
      addPatient(makeSummary({ id: 'm1', source: 'manual' }))
      const results = getAllPatients(undefined)
      expect(results.map((r) => r.id)).toContain('m1')
    })
  })
})
