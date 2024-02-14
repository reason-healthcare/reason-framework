import assert from 'assert'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv';
import { Given, When, Then, DataTable, AfterAll, After } from '@cucumber/cucumber'

dotenv.config();

interface TestContext {
  planDefinitionIdentifier: string
  patientContextIdentifier: string
  cpgResponse: fhir4.Bundle | undefined
  requestResources: string[] | undefined
}

type RequestResource = fhir4.MedicationRequest | fhir4.Task | fhir4.ServiceRequest // | fhir4.CommunicationRequest

const resolveInstantiatesCanonical = (instantiatesCanonical: string | string[] | undefined) => {
  if (typeof instantiatesCanonical === "string") {
    return instantiatesCanonical.split("|")[0]
  } else if (instantiatesCanonical && instantiatesCanonical.length) {
    return instantiatesCanonical[0].split("|")[0]
  }
}

const removeFromRequests = (canonical: string | undefined, resources: string[] | undefined) =>  {
  if (typeof canonical === 'string' && resources?.includes(canonical)) {
    resources = resources.filter(c => c !== canonical)
  }
  return resources
}

const createEndpoint = (type: string, address: string) => {
  let endpointType
  if (address.startsWith('file://')) {
    endpointType = "hl7-fhir-file"
  } else if (address.startsWith('http')) {
    endpointType = "hl7-fhir-rest"
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
    }
  } as fhir4.Endpoint
}

Given('{string} is loaded', function (this: TestContext, planDefinitionIdentifier: string) {
  this.planDefinitionIdentifier = planDefinitionIdentifier
});

When('apply is called with context {string}', async function(this: TestContext, patientContextIdentifier: string) {
  this.patientContextIdentifier = patientContextIdentifier
  const filePath = path.join(process.cwd(), 'output', `Bundle-${patientContextIdentifier}.json`)
  const patientContext: fhir4.Bundle = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }))

  const {
    CONTENT_ENDPOINT,
    TERMINOLOGY_ENDPOINT,
    CPG_ENDPOINT
  } = process.env

  if (!CONTENT_ENDPOINT) {
    throw new Error('Must specify content endpoint')
  }
  const contentEndpoint: fhir4.Endpoint = createEndpoint('content', CONTENT_ENDPOINT)
  const terminologyEndpoint = TERMINOLOGY_ENDPOINT ? createEndpoint('terminology', TERMINOLOGY_ENDPOINT) : createEndpoint('terminology', CONTENT_ENDPOINT)

  const body: fhir4.Parameters = {
    resourceType: "Parameters",
    parameter: [
      {
        name: "url",
        valueString: this.planDefinitionIdentifier
      },
      {
        name: "data",
        resource: patientContext
      },
      {
        name: "contentEndpoint",
        resource: contentEndpoint
      },
      {
        name: "terminologyEndpoint",
        resource: terminologyEndpoint
      }
    ]
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    })
    this.cpgResponse = await response.json()
    if (!response.ok) {
      throw response
    }
  } catch (e) {
    console.log(e)
  }

  // Create list of request resources. Each request resource that is asserted will be removed from the list. After all assertions, this array should be empty.
  this.requestResources = this.cpgResponse?.entry?.map(entry => {
    const type = entry.resource?.resourceType
    const requestResourceTypes = ["Task", "CommunicationRequest", "MedicationRequest", "ImmunizationRecommendation"]
    let canonical: RequestResource["instantiatesCanonical"]
    if (type && requestResourceTypes.includes(type)) {
      const resource = entry.resource as RequestResource
      canonical = resolveInstantiatesCanonical(resource.instantiatesCanonical)
    }
    return canonical
  }).filter(canonical => canonical != null) as string[]

})

Then('{string} should have been recommended', function (this: TestContext, activityDefinitionIdentifier: string) {
  const instantiatedResource = this.cpgResponse?.entry?.find(entry => {
    const resource = entry.resource as fhir4.RequestGroup | RequestResource
    const instantiatesCanonical = resolveInstantiatesCanonical(resource.instantiatesCanonical)
    const isMatch = instantiatesCanonical === activityDefinitionIdentifier
    isMatch ? this.requestResources = removeFromRequests(instantiatesCanonical, this.requestResources) : null
    return isMatch
  })
  assert(instantiatedResource, `Recommendations include ${this.requestResources}`)
});

Then('select {string} of the following should have been recommended', function (this: TestContext, selectionBehaviorCode: string, activityDefinitionIdentifierTable: DataTable) {
  const activityDefinitionIdentifiers: string[] = activityDefinitionIdentifierTable.raw().map(i => i[0]).sort()

  const resolveRequestResource = (action: fhir4.RequestGroupAction) => {
    if (action.resource?.reference) {
      const id = action.resource.reference.split("/")[1]
      return this.cpgResponse?.entry?.find(e => e.resource?.id === id)?.resource as fhir4.RequestGroup | RequestResource
    }
  }

  const resourceWithSelection = this.cpgResponse?.entry?.find(entry => {
    const resource = entry.resource as fhir4.RequestGroup
    const actionWithSelection = resource.action?.find(action => {
      if (action.selectionBehavior && action.selectionBehavior === selectionBehaviorCode && action.action) {
        const activityCanonicals = action.action.map(subAction => {
          const requestResource = resolveRequestResource(subAction)
          return resolveInstantiatesCanonical(requestResource?.instantiatesCanonical) ?? undefined
        }).filter(canonical => canonical != null).sort() as string[]
        const isMatch = activityCanonicals.sort().toString() === activityDefinitionIdentifiers.sort().toString()
        isMatch ? activityCanonicals.forEach(c => this.requestResources = removeFromRequests(c, this.requestResources)) : null
        return isMatch
      }
    })
    return actionWithSelection
  })
  assert(resourceWithSelection, `Recommendations include ${this.requestResources}`)
});

Then('no activites should have been recommended', function (this: TestContext) {
  assert(!this.requestResources || this.requestResources.length === 0, `Found additional recommendations ${this.requestResources}`)
});

After(function (this: TestContext) {
  assert(!this.requestResources || this.requestResources.length === 0, `Found additional recommendations ${this.requestResources}`)
});
