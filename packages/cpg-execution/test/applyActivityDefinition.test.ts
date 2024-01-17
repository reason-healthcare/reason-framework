import { applyActivityDefinition } from '../src/applyActivityDefinition'
import path from 'path'
import { is } from '../src/helpers'
import { fixture } from './testHelpers'

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

describe('.apply', () => {
  test('simple ActivityDefinition', async () => {
    const subject = 'Patient/Patient123'
    const activityDefinition = fixture<fhir4.ActivityDefinition>(
      'ActivityDefinition-SimpleActivityDefinition'
    )
    const result = await applyActivityDefinition({
      activityDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })
    const resource = result
    if (is.MedicationRequest(resource)) {
      expect(resource.status).toEqual('draft')
      const { medicationCodeableConcept } = resource
      expect(medicationCodeableConcept).toEqual(
        activityDefinition.productCodeableConcept
      )
    } else {
      fail('Not a MedicationRequest')
    }
  })

  test('ActivityDefinition with dynamicValue (fhirpath)', async () => {
    const subject = 'Patient/Patient123'
    const activityDefinition = fixture<fhir4.ActivityDefinition>(
      'ActivityDefinition-ActivityDefinitionWithFhirPath'
    )
    const result = await applyActivityDefinition({
      activityDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })
    const resource = result
    if (is.MedicationRequest(resource)) {
      expect(resource.reasonCode?.[0]?.text).toEqual('rheumatoid arthritis')
      expect(resource.reasonCode?.[0]?.coding?.[0].system).toEqual(
        'http://hl7.org/fhir/sid/icd-10'
      )
      expect(resource.reasonCode?.[0]?.coding?.[0].code).toEqual('M06.9')
    } else {
      fail('Not a MedicationRequest')
    }
  })

  test('ActivityDefinition with CQL', async () => {
    const exampleIgPath = path.resolve(
      path.join(__dirname, 'fixtures', 'ExampleIG', 'output')
    )
    const subject = 'Patient/Patient123'
    const activityDefinition = fixture<fhir4.ActivityDefinition>(
      'ActivityDefinition-CommunicationRequestActivity',
      exampleIgPath
    )
    const result = await applyActivityDefinition({
      activityDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })
    const resource = result ?? {}
    if (is.CommunicationRequest(resource)) {
      expect(resource.payload?.[0]?.contentString).toEqual(
        'welcome to my message from CQL!'
      )
    } else {
      fail('Not a CommunicationRequest')
    }
  })
})
