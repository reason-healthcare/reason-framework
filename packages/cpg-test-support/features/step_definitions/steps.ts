import assert from 'assert'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv';
import { Given, When, Then, DataTable } from '@cucumber/cucumber'

dotenv.config();

interface TestContext {
  planDefinitionIdentifier: string
  patientContextIdentifier: string
  cpgResponse: fhir4.Bundle | undefined
  recommendations: string[] | undefined
}

const resolveInstantiatesCanonical = (instantiatesCanonical: string | string[] | undefined) => {
  if (typeof instantiatesCanonical === "string") {
    return instantiatesCanonical.split("|")[0]
  } else if (instantiatesCanonical && instantiatesCanonical.length) {
    return instantiatesCanonical[0].split("|")[0]
  }
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
    this.cpgResponse = await response.json();
    if (!response.ok) {
      throw response
    }
  } catch (e) {
    console.log(e)
  }
})

Then('{string} should have been recommended', function (this: TestContext, activityDefinitionIdentifier: string) {
  const instantiatedResource = this.cpgResponse?.entry?.find(entry => {
    const resource = entry.resource as fhir4.RequestGroup | fhir4.MedicationRequest | fhir4.Task | fhir4.ServiceRequest
    return resolveInstantiatesCanonical(resource.instantiatesCanonical) === activityDefinitionIdentifier
  })
  assert(instantiatedResource)
});

// so you have to keep track of all the recommendation actions, and then if there are any left after the assertions, that's a failure

Then('select {string} of the following should have been recommended', function (this: TestContext, selectionBehaviorCode: string, activityDefinitionIdentifierTable: DataTable) {
  const activityDefinitionIdentifiers: string[] = activityDefinitionIdentifierTable.raw().map(i => i[0]).sort()

  const resolveRequestResource = (action: fhir4.RequestGroupAction) => {
    if (action.resource?.reference) {
      const id = action.resource.reference.split("/")[1]
      return this.cpgResponse?.entry?.find(e => e.resource?.id === id)?.resource as fhir4.RequestGroup | fhir4.MedicationRequest | fhir4.Task | fhir4.ServiceRequest
    }
  }

  const resourceWithSelection = this.cpgResponse?.entry?.find(entry => {
    const resource = entry.resource as fhir4.RequestGroup
    const actionWithSelection = resource.action?.find(action => {
      if (action.selectionBehavior && action.selectionBehavior === selectionBehaviorCode && action.action) {
        const activityCanonicals = action.action.map(subAction => {
          const requestResource = resolveRequestResource(subAction)
          return resolveInstantiatesCanonical(requestResource?.instantiatesCanonical) ?? undefined
        }).filter(canonical => canonical != null).sort()
        return activityCanonicals.sort().toString() === activityDefinitionIdentifiers.sort().toString()
      }
    })
    return actionWithSelection
  })

  assert(resourceWithSelection)
});

Then('no activites should have been recommended', function (this: TestContext) {
  //TODO: there may be multiple requests that should not be present. Identify all of these vs just the first.
  const requestResource = this.cpgResponse?.entry?.find(entry => {
    const type = entry.resource?.resourceType
    console.log(type + 'type')
    const requestResourceTypes = ["Task", "CommunicationRequest", "MedicationRequest", "ImmunizationRecommendation"]
    if (type && requestResourceTypes.includes(type)) {
      return true
    }
    return false
  })

  assert(requestResource == null, `Found request of type ${requestResource?.resource?.resourceType}`)
})
