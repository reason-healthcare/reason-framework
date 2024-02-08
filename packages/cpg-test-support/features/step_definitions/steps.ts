import assert from 'assert'
import fs from 'fs'
import { Given, When, Then } from '@cucumber/cucumber'

interface TestContext {
  planDefinitionIdentifier: string
  patientContextIdentifier: string
  cpgResponse: fhir4.Bundle | undefined
}

Given('{string} is loaded', function (this: TestContext, planDefinitionIdentifier: string) {
  // e.g. http://acme/PlanDefinition/MyPlanDefinition|0.1.1
  this.planDefinitionIdentifier = planDefinitionIdentifier
});

When('apply is called with context {string}', async function(this: TestContext, patientContextIdentifier: string) {
  this.patientContextIdentifier = patientContextIdentifier
  // TODO: Need to load the bundle in output/Bundle-XXX.json and JSON parse to create `patientContent`
  const patientContext: fhir4.Bundle = JSON.parse(fs.readFileSync(`../../DevIG/output/Bundle-${patientContextIdentifier}`, { encoding: 'utf8' })) // Maybe we handle the file name dynamically based on an environment variable?
  // TODO: Throw error if there is more than one patient in patient context

  let endpointType
  if (process.env.CONTENT_ENDPOINT?.startsWith('file://')) {
    endpointType = "hl7-fhir-file"
  } else if (process.env.CONTENT_ENDPOINT?.startsWith('http')) {
    endpointType = "hl7-fhir-rest"
  } else {
    throw new Error('Must specify http or file endpoint')
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
        valueString: this.patientContextIdentifier
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

  /*
   TODO: Fetch to `GET {process.ENV.CPG_ENDPOINT}/PlanDefinition/$apply` with body:
   const body = {
    url: `${this.planDefinitionIdentifier.split('|')[0]}`,
    version: `${this.planDefinitionIdentifier.split('|')[1]`,
    contentEndpoint: process.env.CONTENT_ENDPOINT,
    data: patientContext
   }

   // Then do the request and store response
   const this.response = await fetch{
    url: process.env.CPG_ENDPOINT,
    body
   }
   */
  if (!process.env.CPG_ENDPOINT) {
    throw new Error('Must specify CPG Engine Endpoint')
  }
  let response
  try {
    response = await fetch(process.env.CPG_ENDPOINT, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw response
    }
  } catch (e) {
    console.log(e)
  }
})

Then('{string} should have been recommended', function (this: TestContext, activityDefinitionIdentifier: string) {
  // TODO: Look at the resulting RequestGroup and filter all the leaf nodes in all RGs in the response bundle,
  // resolve the `RG.action.resource` and find where `resource.instantiatesCanonical` matches the `activityDefinitionIdentifier`
});
