import assert from 'assert'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv';
import { Given, When, Then } from '@cucumber/cucumber'

dotenv.config();

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
  // TODO: handle data endpoint
  const filePath = path.join(process.cwd(), 'output', `Bundle-${patientContextIdentifier}.json`)
  const patientContext: fhir4.Bundle = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }))
  // TODO: Throw error if there is more than one patient in patient context

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
    console.log(JSON.stringify(this.cpgResponse))
    if (!response.ok) {
      throw response
    }
  } catch (e) {
    console.log(e)
  }
})

Then('{string} should have been recommended', function (this: TestContext, activityDefinitionIdentifier: string) {
  const assert = require('assert')
  const instantiatedResource= this.cpgResponse?.entry?.find(entry => {
    const resource = entry.resource as fhir4.RequestGroup | fhir4.MedicationRequest | fhir4.Task | fhir4.ServiceRequest
    console.log(resource.instantiatesCanonical + 'canonical')
    if (
      resource.instantiatesCanonical
      && typeof resource.instantiatesCanonical === "string"
      && resource.instantiatesCanonical.split("|")[0] === activityDefinitionIdentifier)
    {
      return true
    }
  })
  assert(instantiatedResource,[`Unable to find recommendation for ${activityDefinitionIdentifier}`])
});

Then('...', function (this: TestContext, activityDefinitionIdentifier: string) {
  // TODO: Look at the resulting RequestGroup and filter all the leaf nodes in all RGs in the response bundle,
  // And "[selection-behavior]" of "[activity-identifier]" and "[activity-identifier]" should be recommended

  // const instantiatedCanonicals = this.cpgResponse.entry.flatMap(e => {
  //   const {
  //     fullUrl,
  //     resource
  //   } = e
  //   let canonicals
  //   if (resource?.resourceType === "RequestGroup" && resource?.action) {
  //     canonicals = resource.action.map((action) => {
  //       let canonical
  //       this.cpgResponse?.entry?.find(entry => {
  //         if (
  //           action.resource?.reference
  //           && entry.fullUrl?.endsWith(action.resource.reference)
  //           && entry.resource?.hasOwnProperty("instantiatesCanonical"))
  //         {
  //           const targetCanonical = entry.resource as fhir4.RequestGroup | fhir4.MedicationRequest | fhir4.Task | fhir4.ServiceRequest
  //           canonical = targetCanonical.instantiatesCanonical
  //           if (canonical && canonical === activityDefinitionIdentifier) {
  //             // assert.equal(canonical, activityDefinitionIdentifier)
  //           }
  //         }
  //       })
  //       return canonical
  //     })
  //   }
  //   return canonicals
  // }).filter(c => c != null)


  // resolve the `RG.action.resource` and find where `resource.instantiatesCanonical` matches the `activityDefinitionIdentifier`
});
