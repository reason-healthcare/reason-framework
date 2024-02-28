import assert from 'assert'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { Given, When, Then, DataTable, After } from '@cucumber/cucumber'

dotenv.config()

interface TestContext {
  planDefinitionIdentifier: string
  planDefinitionCanonical: string
  patientContextIdentifier: string
  cpgResponse: fhir4.Bundle | undefined
  requestResources: string[] | undefined
}

type RequestResource =
  | fhir4.MedicationRequest
  | fhir4.Task
  | fhir4.ServiceRequest // | fhir4.CommunicationRequest

const resolveInstantiatesCanonical = (
  instantiatesCanonical: string | string[] | undefined
) => {
  if (typeof instantiatesCanonical === 'string') {
    return instantiatesCanonical.split('|')[0]
  } else if (instantiatesCanonical && instantiatesCanonical.length) {
    return instantiatesCanonical[0].split('|')[0]
  }
}

const removeFromRequests = (
  canonical: string | undefined,
  resources: string[] | undefined
) => {
  if (typeof canonical === 'string' && resources?.includes(canonical)) {
    resources = resources.filter((c) => c !== canonical)
  }
  return resources
}

const isEmpty = (requests: string[] | undefined) => {
  return !requests || requests.length === 0
}

const notEmpty = <TValue>(
  value: TValue | null | undefined
): value is TValue => {
  return value !== null && value !== undefined
}

const createEndpoint = (type: string, address: string) => {
  let endpointType
  if (address.startsWith('file://')) {
    endpointType = 'hl7-fhir-file'
  } else if (address.startsWith('http')) {
    endpointType = 'hl7-fhir-rest'
  } else {
    throw new Error(`${type} endpoint must start with http or file`)
  }

  return {
    resourceType: 'Endpoint',
    address: address,
    status: 'active',
    payloadType: [
      {
        coding: [
          {
            code: type,
          },
        ],
      },
    ],
    connectionType: {
      code: endpointType,
    },
  } as fhir4.Endpoint
}

const { CONTENT_ENDPOINT, TERMINOLOGY_ENDPOINT, CPG_ENDPOINT } = process.env

Given(
  '{string} is loaded',
  function (this: TestContext, planDefinitionIdentifier: string) {
    this.planDefinitionIdentifier = planDefinitionIdentifier
    // TODO: handle rest endpoint resolve PD
    if (CONTENT_ENDPOINT?.startsWith('file://')) {
      const planDef: fhir4.PlanDefinition = JSON.parse(
        fs.readFileSync(
          `${CONTENT_ENDPOINT.replace(
            'file://',
            ''
          )}/PlanDefinition-${planDefinitionIdentifier}.json`,
          { encoding: 'utf8' }
        )
      )
      if (planDef && planDef.url) {
        this.planDefinitionCanonical = planDef.url
      } else {
        throw new Error('Unable to resolve plan definition')
      }
    }
  }
)

When(
  'apply is called with context {string}',
  async function (this: TestContext, patientContextIdentifier: string) {
    this.patientContextIdentifier = patientContextIdentifier
    const filePath = path.join(
      process.cwd(),
      'output',
      `Bundle-${patientContextIdentifier}.json`
    )
    const patientContext: fhir4.Bundle = JSON.parse(
      fs.readFileSync(filePath, { encoding: 'utf8' })
    )

    const { CONTENT_ENDPOINT, TERMINOLOGY_ENDPOINT, CPG_ENDPOINT } = process.env

    if (!CONTENT_ENDPOINT) {
      throw new Error('Must specify content endpoint')
    }
    const contentEndpoint: fhir4.Endpoint = createEndpoint(
      'content',
      CONTENT_ENDPOINT
    )
    const terminologyEndpoint = TERMINOLOGY_ENDPOINT
      ? createEndpoint('terminology', TERMINOLOGY_ENDPOINT)
      : createEndpoint('terminology', CONTENT_ENDPOINT)

    const body: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'url',
          valueString: this.planDefinitionCanonical,
        },
        {
          name: 'data',
          resource: patientContext,
        },
        {
          name: 'contentEndpoint',
          resource: contentEndpoint,
        },
        {
          name: 'terminologyEndpoint',
          resource: terminologyEndpoint,
        },
      ],
    }

    let cpgEndpoint = CPG_ENDPOINT
    if (!cpgEndpoint) {
      throw new Error('Must specify CPG Engine Endpoint')
    } else if (cpgEndpoint.startsWith('http://localhost')) {
      cpgEndpoint = cpgEndpoint.replace('http://localhost', 'http://127.0.0.1')
    }
    try {
      const response = await fetch(`${cpgEndpoint}/PlanDefinition/$apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      this.cpgResponse = await response.json()
      if (!response.ok) {
        throw response
      }
    } catch (e) {
      console.log(e)
    }

    // Create list of request resources. Each request resource that is asserted will be removed from the list. After all assertions, this array should be empty.
    this.requestResources = this.cpgResponse?.entry
      ?.map((entry) => {
        const type = entry.resource?.resourceType
        const requestResourceTypes = [
          'Task',
          'CommunicationRequest',
          'MedicationRequest',
          'ImmunizationRecommendation',
          'RequestGroup',
        ]
        let canonical
        if (type && requestResourceTypes.includes(type)) {
          const resource = entry.resource as RequestResource
          canonical = resolveInstantiatesCanonical(
            resource.instantiatesCanonical
          )
        }
        return canonical && canonical != this.planDefinitionCanonical
          ? canonical.split('/').pop()
          : null
      })
      .filter(notEmpty) as string[]
  }
)

Then(
  '{string} should have been recommended',
  function (this: TestContext, activityDefinitionIdentifier: string) {
    const instantiatedResource = this.cpgResponse?.entry?.find((entry) => {
      // Custom type RequestResource does not currently include communication request because CPG v1.0 excludes instantiates canonical from this resource. v2.0 will include instantiates canonical, so the server should be updated.
      const resource = entry.resource as fhir4.RequestGroup | RequestResource
      const instantiatesCanonical = resolveInstantiatesCanonical(
        resource.instantiatesCanonical
      )
      const isMatch =
        instantiatesCanonical?.split('/').pop() === activityDefinitionIdentifier
      isMatch
        ? (this.requestResources = removeFromRequests(
            instantiatesCanonical.split('/').pop(),
            this.requestResources
          ))
        : null
      return isMatch
    })
    assert(
      instantiatedResource,
      `\nExpected recommendation:\n- ${activityDefinitionIdentifier}\nBut found:\n- ${
        isEmpty(this.requestResources)
          ? 'no recommendations'
          : this.requestResources?.join('\n- ')
      }`
    )
  }
)

Then(
  'select {string} of the following should have been recommended',
  function (
    this: TestContext,
    selectionBehaviorCode: string,
    activityDefinitionIdentifierTable: DataTable
  ) {
    const activityDefinitionIdentifiers: string[] =
      activityDefinitionIdentifierTable
        .raw()
        .map((i) => i[0])
        .sort()

    const resolveRequestResource = (action: fhir4.RequestGroupAction) => {
      if (action.resource?.reference) {
        const id = action.resource.reference.split('/')[1]
        return this.cpgResponse?.entry?.find((e) => e.resource?.id === id)
          ?.resource as fhir4.RequestGroup | RequestResource
      }
    }

    const findSelectionGroup: any = (action: fhir4.RequestGroupAction[]) => {
      let selectionMatch
      for (let i = 0; i < action.length && !selectionMatch; i++) {
        let subAction = action[i]
        if (
          subAction.selectionBehavior &&
          subAction.selectionBehavior === selectionBehaviorCode
        ) {
          selectionMatch = subAction
        } else if (subAction.action) {
          selectionMatch = findSelectionGroup(subAction.action)
        }
      }
      return selectionMatch
    }

    const getCanonicalMatch = (
      selectionGroupAction: fhir4.RequestGroupAction[]
    ) => {
      let isMatch = false
      const selectionGroupActivityIds = selectionGroupAction
        .map((subAction) => {
          const canonical = resolveInstantiatesCanonical(
            resolveRequestResource(subAction)?.instantiatesCanonical
          )
          return canonical ? canonical.split('/').pop() : null
        })
        .filter(notEmpty)
      isMatch =
        selectionGroupActivityIds.sort().toString() ===
        activityDefinitionIdentifiers.sort().toString()
      if (isMatch) {
        selectionGroupActivityIds.forEach(
          (id) =>
            (this.requestResources = removeFromRequests(
              id,
              this.requestResources
            ))
        )
      }
      return isMatch
    }

    let isSelectionMatch = false
    let isCanonicalMatch = false
    if (this.cpgResponse?.entry) {
      for (
        let i = 0;
        i < this.cpgResponse.entry.length && !isCanonicalMatch;
        i++
      ) {
        const resource = this.cpgResponse.entry[i]
          .resource as fhir4.RequestGroup
        const selectionMatch = resource.action
          ? findSelectionGroup(resource.action)
          : null
        if (selectionMatch) {
          isSelectionMatch = true
          isCanonicalMatch = selectionMatch.action
            ? getCanonicalMatch(selectionMatch.action)
            : false
        }
      }
    }

    const message = !isSelectionMatch
      ? `Recommendation with selection behavior "${selectionBehaviorCode}" expected, but does not exist`
      : `\nExpected recommendations:\n- ${activityDefinitionIdentifiers.join(
          '\n- '
        )} \nBut found:\n- ${
          isEmpty(this.requestResources)
            ? 'no recommendations'
            : this.requestResources?.join('\n- ')
        }`
    assert(isCanonicalMatch, message)
  }
)

Then('no activites should have been recommended', function (this: TestContext) {
  assert(
    isEmpty(this.requestResources),
    `Found unexpected recommendations:\n- ${this.requestResources?.join(
      '\n- '
    )}`
  )
})

After(function (this: TestContext, scenario) {
  if (scenario?.result?.status === 'PASSED') {
    assert(
      isEmpty(this.requestResources),
      `Found unexpected recommendations:\n- ${this.requestResources?.join(
        '\n- '
      )}`
    )
  }
})
