import path from 'path'
import fs from 'fs'
import { inspect, is } from '../src/helpers'
import Resolver from '../src/resolver'
import Cache from '../src/cache'

const exampleIgPath = path.resolve(
  path.join(__dirname, 'fixtures', 'ExampleIG', 'output')
)

const fileEndpoint: fhir4.Endpoint = {
  resourceType: 'Endpoint',
  address: `file://${exampleIgPath}`,
  status: 'active',
  payloadType: [
    {
      coding: [{ code: 'all' }]
    }
  ],
  connectionType: {
    code: 'hl7-fhir-file'
  }
}

const restEndpoint: fhir4.Endpoint = {
  resourceType: 'Endpoint',
  address: `https://hapi.fhir.org/baseR4`,
  status: 'active',
  payloadType: [
    {
      coding: [{ code: 'all' }]
    }
  ],
  connectionType: {
    code: 'hl7-fhir-rest'
  }
}

describe('.prepareValueSets', () => {
  beforeEach(() => Cache.destroy())
  test('file-based', async () => {
    const resolver = Resolver(fileEndpoint)
    const elmJson = fs
      .readFileSync(
        path.resolve(
          path.join(
            __dirname,
            'fixtures',
            'ExampleIG',
            'output',
            'Library-ExampleLibrary-2.json'
          )
        )
      )
      .toString()
    const elmLibrary = JSON.parse(elmJson)

    if (resolver.preloadValueSets != null) {
      await resolver.preloadValueSets(elmLibrary)
      const valueset = resolver.findValueSet(
        'http://example.org/ValueSet/Height'
      )
      expect(valueset?.oid).toEqual('http://example.org/ValueSet/Height')
      expect(valueset?.codes?.length).toEqual(5)
    }
  })

  test('rest-based', async () => {
    const resolver = Resolver(restEndpoint)
    const elmJson = fs
      .readFileSync(
        path.resolve(
          path.join(
            __dirname,
            'fixtures',
            'ExampleIG',
            'output',
            'Library-ExampleLibrary-2.json'
          )
        )
      )
      .toString()
    const elmLibrary = JSON.parse(elmJson)

    if (resolver.preloadValueSets != null) {
      await resolver.preloadValueSets(elmLibrary)
      const valueset = resolver.findValueSet(
        'http://example.org/ValueSet/Height'
      )
      expect(valueset?.oid).toEqual('http://example.org/ValueSet/Height')
      expect(valueset?.codes?.length).toEqual(5)
    }
  })
})

describe('.resolveCanonical', () => {
  test('REST resolver', async () => {
    const endpoint: fhir4.Endpoint = {
      resourceType: 'Endpoint',
      status: 'active',
      address: 'http://hapi.fhir.org/baseR4',
      connectionType: {
        code: 'hl7-fhir-rest'
      },
      payloadType: [
        {
          coding: [
            {
              code: 'all'
            }
          ]
        }
      ]
    }
    const resolver = Resolver(endpoint)
    const results = await resolver.resolveCanonical(
      'http://hapi.fhir.org/baseR4/ValueSet/PatientTaxSituation2',
      ['ValueSet']
    )
    expect(is.ValueSet(results)).toBeTruthy()
  })
})
