import path from 'path'
import { applyPlanDefinition } from '../src/applyPlanDefinition'
import { inspect, is, referenceFromResource } from '../src/helpers'
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
  test('simple PlanDefinition', async () => {
    const subject = 'Patient/123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-SimplePlanDefinition'
    )
    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource

    if (is.RequestGroup(requestGroup)) {
      expect(requestGroup?.subject?.reference).toEqual('Patient/123')
      expect(requestGroup?.status).toEqual('draft')
      expect(requestGroup?.intent).toEqual('proposal')
      expect(requestGroup?.instantiatesCanonical).toEqual([
        'http://example.org/PlanDefinition/SimplePlanDefinition|0.1.0'
      ])
    } else {
      throw new Error(
        `First resource in Bundle is not a RequestGroup: ${inspect(result)}`
      )
    }
  })

  test('PlanDefinition with goal', async () => {
    const subject = 'Patient/123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-SimplePlanDefinitionWithGoal'
    )

    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource
    const goal = result.entry?.map((e) => e.resource).find(is.Goal)
    if (goal === undefined) {
      throw new Error(`Goal missing from result bundle: ${inspect(result)}`)
    }

    expect(goal?.description.text).toEqual('to improve')

    if (is.RequestGroup(requestGroup)) {
      const goalExtension = requestGroup.extension?.find((e) =>
        e.url.endsWith('resource-pertainsToGoal')
      )
      expect(goalExtension?.valueReference).toEqual(referenceFromResource(goal))
    } else {
      throw new Error(
        `First resource in Bundle is not a RequestGroup: ${inspect(result)}`
      )
    }
  })

  test('PlanDefinition with action', async () => {
    const subject = 'Patient/123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-PlanDefinitionWithAction'
    )
    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource
    expect(is.RequestGroup(requestGroup)).toBeTruthy()

    const { action } = requestGroup as fhir4.RequestGroup

    expect(action?.length).toBe(1)
    expect(action?.[0]?.id).toEqual('action-1')
    expect(action?.[0]?.prefix).toEqual('action-1 prefix')
    expect(action?.[0]?.title).toEqual('action-1 title')
    expect(action?.[0]?.description).toEqual('action-1 description')
    expect(action?.[0]?.textEquivalent).toEqual('action-1 textEquivalent')
    expect(action?.[0]?.priority).toEqual('routine')
    expect(action?.[0]?.relatedAction).toEqual([
      { actionId: 'action-1 relatedActionId', relationship: 'before' }
    ])
    expect(action?.[0]?.code).toEqual([{ text: 'action-1 code' }])
  })

  test('PlanDefinition with multiple flat actions', async () => {
    const subject = 'Patient/123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-PlanDefinitionWithActionMultiFlat'
    )

    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource
    expect(is.RequestGroup(requestGroup)).toBeTruthy()

    const { action } = requestGroup as fhir4.RequestGroup

    expect(action?.length).toBe(2)
    expect(action?.[0]?.id).toEqual('action-1')
    expect(action?.[1]?.id).toEqual('action-2')
    expect(action?.[1]?.description).toEqual('action-2 description')
  })

  test('PlanDefinition with multiple nested actions', async () => {
    const subject = 'Patient/123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-PlanDefinitionWithActionMultiNested'
    )
    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource
    expect(is.RequestGroup(requestGroup)).toBeTruthy()

    const { action } = requestGroup as fhir4.RequestGroup

    if (action != null) {
      expect(action.length).toBe(1)
      expect(action[0]?.id).toEqual('action-1')

      const { action: subAction } = action[0]
      expect(subAction?.[0]?.id).toEqual('action-1.1')

      const subSubAction = subAction?.[0]?.action
      expect(subSubAction?.[0]?.id).toEqual('action-1.1.1')
    } else {
      fail('action is not defined!')
    }
  })

  test('PlanDefinition ECA with simple applicability condition 1', async () => {
    const subject = 'Patient/Patient123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-EcaWithApplicabilitySimple1',
      exampleIgPath
    )

    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource
    if (is.RequestGroup(requestGroup)) {
      const { action } = requestGroup
      expect(action).toBeUndefined()
    } else {
      fail('Expecting first bundle entry to be RequestGroup')
    }
  })

  test('PlanDefinition ECA with simple applicability condition 2', async () => {
    const subject = 'Patient/Patient123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-EcaWithApplicabilitySimple2'
    )
    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource
    if (is.RequestGroup(requestGroup)) {
      const { action } = requestGroup
      expect(action).toBeDefined()
    } else {
      fail('Expecting first bundle entry to be RequestGroup')
    }
  })

  test('PlanDefinition ECA with multi applicability condition 1', async () => {
    const exampleIgPath = path.resolve(
      path.join(__dirname, 'fixtures', 'ExampleIG', 'output')
    )
    const subject = 'Patient/Patient123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-EcaWithApplicabilityMulti1',
      exampleIgPath
    )
    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource
    if (is.RequestGroup(requestGroup)) {
      const { action } = requestGroup
      expect(action).toBeDefined()
    } else {
      fail('Expecting first bundle entry to be RequestGroup')
    }
  })

  test('PlanDefinition ECA with multi applicability condition 2', async () => {
    const exampleIgPath = path.resolve(
      path.join(__dirname, 'fixtures', 'ExampleIG', 'output')
    )
    const subject = 'Patient/Patient123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-EcaWithApplicabilityMulti2',
      exampleIgPath
    )

    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const requestGroup = result.entry?.[0]?.resource
    if (is.RequestGroup(requestGroup)) {
      const { action } = requestGroup
      expect(action).toBeUndefined()
    } else {
      fail('Expecting first bundle entry to be RequestGroup')
    }
  })

  test('PlanDefinition ECA with communication action', async () => {
    const exampleIgPath = path.resolve(
      path.join(__dirname, 'fixtures', 'ExampleIG', 'output')
    )
    const subject = 'Patient/Patient123'
    const planDefinition = fixture<fhir4.PlanDefinition>(
      'PlanDefinition-EcaWithCommunicationAction',
      exampleIgPath
    )

    const result = await applyPlanDefinition({
      planDefinition,
      subject,
      contentEndpoint: fileEndpoint,
      terminologyEndpoint: fileEndpoint,
      dataEndpoint: fileEndpoint
    })

    const resources = result.entry?.map((e) => e.resource)
    expect(resources?.length).toEqual(2)

    const requestGroup = resources?.[0]
    const communicationRequest = resources?.[1]

    let communicationRequestCanonical = ''
    if (is.CommunicationRequest(communicationRequest)) {
      communicationRequestCanonical = `CommunicationRequest/${communicationRequest.id}`
    } else {
      fail('Second resource is not CommunicationRequest')
    }

    if (is.RequestGroup(requestGroup)) {
      expect(requestGroup.action?.length).toEqual(1)
      expect(requestGroup.action?.[0]?.resource?.reference).toEqual(
        communicationRequestCanonical
      )
    } else {
      fail('First resource is not RequestGroup')
    }
  })
})
