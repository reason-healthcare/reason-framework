import {
  extractBundlesFromResolver,
  indexPackageBundles,
} from 'utils/packageBundleExtractor'
import * as recentPatientsStore from 'utils/recentPatientsStore'

jest.mock('utils/recentPatientsStore', () => ({
  ...jest.requireActual('utils/recentPatientsStore'),
  setPackageCatalog: jest.fn(),
  renderPatientName: jest.requireActual('utils/recentPatientsStore')
    .renderPatientName,
}))

describe('UploadSection bundle extraction', () => {
  it('extracts bundles that contain Patient resources', () => {
    const resolver = {
      resourcesByReference: {
        'Bundle/one': {
          resourceType: 'Bundle',
          id: 'one',
          type: 'collection',
          entry: [
            {
              resource: {
                resourceType: 'Patient',
                id: 'p1',
                name: [{ given: ['Alice'], family: 'Smith' }],
                birthDate: '1990-01-01',
                gender: 'female',
              },
            },
            {
              resource: {
                resourceType: 'Observation',
                id: 'obs1',
                status: 'final',
                code: { text: 'HR' },
              },
            },
          ],
        },
      },
    } as any

    const result = extractBundlesFromResolver(resolver)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(
      expect.objectContaining({
        source: 'package',
        resourceType: 'Bundle',
        id: 'one',
        name: 'Alice Smith [Bundle/one]',
        dob: '1990-01-01',
        gender: 'female',
        resourceCount: 2,
        resourceTypes: ['Patient', 'Observation'],
      })
    )
  })

  it('skips bundles without Patient resources', () => {
    const resolver = {
      resourcesByReference: {
        'Bundle/no-patient': {
          resourceType: 'Bundle',
          id: 'no-patient',
          type: 'collection',
          entry: [
            {
              resource: {
                resourceType: 'Observation',
                id: 'obs1',
                status: 'final',
                code: { text: 'HR' },
              },
            },
          ],
        },
      },
    } as any

    const result = extractBundlesFromResolver(resolver)

    expect(result).toHaveLength(0)
  })

  it('indexes one catalog entry per extracted package bundle', () => {
    const resolver = {
      resourcesByReference: {
        'Bundle/one': {
          resourceType: 'Bundle',
          id: 'one',
          type: 'collection',
          entry: [
            {
              resource: {
                resourceType: 'Patient',
                id: 'p1',
                name: [{ given: ['Alice'], family: 'Smith' }],
              },
            },
          ],
        },
        'Bundle/two': {
          resourceType: 'Bundle',
          id: 'two',
          type: 'collection',
          entry: [
            {
              resource: {
                resourceType: 'Patient',
                id: 'p2',
                name: [{ given: ['Bob'], family: 'Jones' }],
              },
            },
            {
              resource: {
                resourceType: 'Observation',
                id: 'obs-2',
                status: 'final',
                code: { text: 'Temp' },
              },
            },
          ],
        },
      },
    } as any

    const bundles = extractBundlesFromResolver(resolver)
    const mockSetPackageCatalog =
      recentPatientsStore.setPackageCatalog as jest.MockedFunction<
        typeof recentPatientsStore.setPackageCatalog
      >
    mockSetPackageCatalog.mockClear()

    const indexed = indexPackageBundles(bundles)

    expect(indexed).toBe(2)
    expect(mockSetPackageCatalog).toHaveBeenCalledTimes(1)
    const catalogArg = mockSetPackageCatalog.mock.calls[0][0]
    expect(catalogArg).toHaveLength(2)
    expect(catalogArg[0]).toEqual(
      expect.objectContaining({
        source: 'package',
        resourceType: 'Bundle',
        id: 'one',
      })
    )
    expect(catalogArg[1]).toEqual(
      expect.objectContaining({
        source: 'package',
        resourceType: 'Bundle',
        id: 'two',
      })
    )
  })
})
