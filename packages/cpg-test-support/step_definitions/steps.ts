import assert from 'assert'
import path from 'path'
import dotenv from 'dotenv'
import { Given, When, Then, DataTable, After } from '@cucumber/cucumber'
import {
  RequestResource,
  isEmpty,
  is,
  getInstantiatesCanonical,
  resolveReference,
  removeFromRequests,
  notEmpty,
  createEndpoint,
} from './helpers'

dotenv.config()

interface TestContext {
  planDefinition: fhir4.PlanDefinition
  patientContextIdentifier: string
  cpgResponse: fhir4.Bundle | undefined
  requestResources: string[] | undefined
}

const { CONTENT_ENDPOINT, TERMINOLOGY_ENDPOINT, DATA_ENDPOINT, CPG_ENDPOINT } =
  process.env
const DEFAULT_SERVER = 'http://127.0.0.1:9001' // Default server is cds-service localhost 9001
const filePath = path.join(process.cwd(), 'output')
const DEFAULT_ENDPOINT = `file:///${filePath}` // Default endpoint assumes package is being used at root of IG with an output package
const contentEndpointAddress = CONTENT_ENDPOINT ?? DEFAULT_ENDPOINT
const terminologyEndpointAddress =
  TERMINOLOGY_ENDPOINT ?? CONTENT_ENDPOINT ?? DEFAULT_ENDPOINT
const dataEndpoint = DATA_ENDPOINT ?? DEFAULT_ENDPOINT
const cpgServerAddress = CPG_ENDPOINT ?? DEFAULT_SERVER

Given(
  '{string} is loaded',
  async function (this: TestContext, planDefinitionIdentifier: string) {
    const reference = `PlanDefinition/${planDefinitionIdentifier}`
    let planDefinition = await resolveReference(
      reference,
      contentEndpointAddress
    )
    if (!planDefinition) {
      throw new Error('Unable to resolve plan definition')
    } else if (planDefinition.resourceType !== 'PlanDefinition') {
      throw new Error('Resource does not seem to be a FHIR Plan Definition')
    }
    this.planDefinition = planDefinition
  }
)

When(
  'apply is called with context {string}',
  async function (this: TestContext, patientContextIdentifier: string) {
    this.patientContextIdentifier = patientContextIdentifier
    const reference = `Bundle/${patientContextIdentifier}`
    const patientContext = await resolveReference(reference, dataEndpoint)
    const contentEndpoint: fhir4.Endpoint = createEndpoint(
      'content',
      contentEndpointAddress
    )
    const terminologyEndpoint = createEndpoint(
      'terminology',
      terminologyEndpointAddress
    )

    const body: fhir4.Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'planDefinition',
          resource: this.planDefinition,
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

    let cpgEndpoint = cpgServerAddress
    if (cpgEndpoint.startsWith('http://localhost')) {
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
        const canonical = is.RequestResource(entry.resource)
          ? getInstantiatesCanonical(entry.resource)
          : undefined
        return canonical && canonical != this.planDefinition.url
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
      const instantiatesCanonical = getInstantiatesCanonical(resource)
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
          const resource = resolveRequestResource(subAction)
          const canonical = is.RequestResource(resource)
            ? getInstantiatesCanonical(resource)
            : undefined
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
