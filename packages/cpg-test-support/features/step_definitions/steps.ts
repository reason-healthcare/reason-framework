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
}

const resolveInstantiatesCanonical = (instantiatesCanonical: string | string[] | undefined) => {
  if (typeof instantiatesCanonical === "string") {
    return instantiatesCanonical.split("|")[0]
  } else if (instantiatesCanonical && instantiatesCanonical.length) {
    return instantiatesCanonical[0].split("|")[0]
  }
}

Given('{string} is loaded', function (this: TestContext, planDefinitionIdentifier: string) {
  this.planDefinitionIdentifier = planDefinitionIdentifier
});

When('apply is called with context {string}', async function(this: TestContext, patientContextIdentifier: string) {
  this.patientContextIdentifier = patientContextIdentifier
  const filePath = path.join(process.cwd(), 'output', `Bundle-${patientContextIdentifier}.json`)
  const patientContext: fhir4.Bundle = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }))

  let endpointType
  if (process.env.CONTENT_ENDPOINT?.startsWith('file://')) {
    endpointType = "hl7-fhir-file"
  } else if (process.env.CONTENT_ENDPOINT?.startsWith('http')) {
    endpointType = "hl7-fhir-rest"
  } else {
    throw new Error('Must specify http or file content endpoint')
  }

  const contentEndpoint: fhir4.Endpoint = {
    resourceType: 'Endpoint',
    address: process.env.CONTENT_ENDPOINT,
    status: 'active',
    payloadType: [
      {
        coding: [
          {
            code: 'content',
          },
        ],
      },
    ],
    connectionType: {
      code: endpointType,
    }
  }

  const body: fhir4.Parameters = {
    resourceType: "Parameters",
    parameter: [
      {
        name: "url",
        valueString: this.planDefinitionIdentifier
      },
      {
        name: "contentEndpoint",
        resource: contentEndpoint
      },
      {
        name: "data",
        resource: patientContext
      }
    ]
  }

  if (!process.env.CPG_ENDPOINT) {
    throw new Error('Must specify CPG Engine Endpoint')
  }
  const url = `${process.env.CPG_ENDPOINT}/PlanDefinition/$apply`
  let response
  try {
    response = await fetch(url, {
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
  const instantiatedResource= this.cpgResponse?.entry?.find(entry => {
    const resource = entry.resource as fhir4.RequestGroup | fhir4.MedicationRequest | fhir4.Task | fhir4.ServiceRequest
    return resolveInstantiatesCanonical(resource.instantiatesCanonical) === activityDefinitionIdentifier
  })
  assert(instantiatedResource)
});

Then('{string} of the following should have been recommended', function (this: TestContext, selectionBehaviorCode: string, activityDefinitionIdentifierTable: DataTable) {
  const activityDefinitionIdentifiers: string[] = activityDefinitionIdentifierTable.raw().map(i => i[0]).sort()

  const resolveRequestResource = (action: fhir4.RequestGroupAction) => {
    if (action.resource?.reference) {
      const id = action.resource.reference.split("/")[1]
      return this.cpgResponse?.entry?.find(e => e.resource?.id === id)?.resource as fhir4.RequestGroup | fhir4.MedicationRequest | fhir4.Task | fhir4.ServiceRequest
    }
  }

  const resourceWithSelection = this.cpgResponse?.entry?.find(entry => {
    const resource = entry.resource as fhir4.RequestGroup
    const actionWithSelection = resource.action?.find(aws => {
      if (aws.selectionBehavior && aws.selectionBehavior === selectionBehaviorCode && aws.action) {
        const activityCanonicals = aws.action.map(a => {
          const requestResource = resolveRequestResource(a)
          return resolveInstantiatesCanonical(requestResource?.instantiatesCanonical) ?? undefined
        }).filter(canonical => canonical != null).sort()
        return activityCanonicals.sort().toString() === activityDefinitionIdentifiers.sort().toString()
      }
    })
    return actionWithSelection
  })

  assert(resourceWithSelection)
});
