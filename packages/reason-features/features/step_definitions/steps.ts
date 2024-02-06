import assert from 'assert'
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
})

Then('{string} should have been recommended', function (this: TestContext, activityDefinitionIdentifier: string) {
  // TODO: Look at the resulting RequestGroup and filter all the leaf nodes in all RGs in the response bundle,
  // resolve the `RG.action.resource` and find where `resource.instantiatesCanonical` matches the `activityDefinitionIdentifier`
});
