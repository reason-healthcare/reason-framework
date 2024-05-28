import assert from 'assert'
import path from 'path'
import dotenv from 'dotenv'
import {
  Given,
  When,
  Then,
  DataTable,
  After,
} from '@cucumber/cucumber'
import {
  isEmpty,
  is,
  resolveReference,
  notEmpty,
  createEndpoint,
  findRecommendation,
  findSelectionGroup,
  resolveAction,
  getNestedRecommendations,
  getNestedSelectionGroups,
  removeRecommendation,
  removeRecommendations,
  findRecommendationResources,
} from './helpers'

dotenv.config()

export interface SelectionGroup {
  selectionCode: fhir4.RequestGroupAction['selectionBehavior']
  definitions: string[]
}

export interface TestContext {
  planDefinition: fhir4.PlanDefinition
  patientContextIdentifier: string
  cpgResponse: fhir4.Bundle | undefined
  recommendations: string[] | undefined
  selectionGroups: SelectionGroup[]
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
    const [id, version] = planDefinitionIdentifier.split('|')
    let planDefinition = await resolveReference(
      id,
      'PlanDefinition',
      contentEndpointAddress,
      version
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
  { timeout: 3 * 5000 },
  async function (this: TestContext, patientContextIdentifier: string) {
    this.patientContextIdentifier = patientContextIdentifier
    const reference = `Bundle/${patientContextIdentifier}`
    const patientContext = await resolveReference(
      patientContextIdentifier,
      'Bundle',
      dataEndpoint
    )
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
      console.error(e)
      throw new Error(
        'Unable to call $apply. Check that CPG engine is running and that environment variables are set'
      )
    }

    this.cpgResponse?.entry?.forEach((entry) => {
      if (is.RequestGroup(entry.resource) && entry.resource.action) {
        entry.resource.action.forEach(a => {
          if (this.cpgResponse) {
            const recommendations = getNestedRecommendations(a, this.cpgResponse)
            const selectionGroups = getNestedSelectionGroups(a, this.cpgResponse)
            this.selectionGroups = this.selectionGroups ? this.selectionGroups.concat(selectionGroups) : selectionGroups
            this.recommendations = this.recommendations ? this.recommendations.concat(recommendations) : recommendations
          }
        })
      }
    })
  }
)

// This will not work if multiple actions share the same title, unless these actions are identical
When(
  '{string} is selected',
  function (this: TestContext, selectedActionIdentifier: string) {
    const selectedAction = this.cpgResponse?.entry
      ?.map((e) => {
        let match
        const resource = e.resource
        if (is.RequestGroup(resource) && resource.action && this.cpgResponse) {
          match = resolveAction(
            selectedActionIdentifier,
            resource.action,
            this.cpgResponse
          )
        }
        return match
      })
      .filter(notEmpty)

    // definition/recommendation selection does not need to be unique, but titles should be

    if (!selectedAction || isEmpty(selectedAction)) {
      throw new Error(
        `Unable to find selection match for ${selectedActionIdentifier}`
      )
    } else if (selectedAction.length > 1) {
      console.error(
        `Found more than one action with selection ${selectedActionIdentifier}`
      )
    } else if (this.cpgResponse) {
      this.selectionGroups = getNestedSelectionGroups(
        selectedAction[0],
        this.cpgResponse
      )
      this.recommendations = getNestedRecommendations(
        selectedAction[0],
        this.cpgResponse
      )
    }
  }
)

Then(
  '{string} should have been recommended',
  function (this: TestContext, activityDefinitionIdentifier: string) {
    const recommendationMatch = findRecommendation(
      activityDefinitionIdentifier,
      this.recommendations
    )
    this.recommendations = removeRecommendation(activityDefinitionIdentifier, this.recommendations)
    assert(
      recommendationMatch,
      `\nExpected recommendation:\n- ${activityDefinitionIdentifier}\nBut found:\n- ${
        isEmpty(this.recommendations)
          ? '- No remaining recommendations'
          : this.recommendations?.join('\n- ')
      }`
    )
  }
)

Then(
  'select {string} of the following should have been recommended',
  function (
    this: TestContext,
    selectionBehaviorCode:
      | 'any'
      | 'all'
      | 'all-or-none'
      | 'exactly-one'
      | 'at-most-one'
      | 'one-or-more',
    selectionDefinitionIdentifiersTable: DataTable
  ) {
    const selectionDefinitionIdentifiers: string[] =
      selectionDefinitionIdentifiersTable
        .raw()
        .map((i) => i[0])
        .sort()

    const selectionGroupMatch = findSelectionGroup(
      selectionBehaviorCode,
      selectionDefinitionIdentifiers,
      this.selectionGroups
    )
    this.selectionGroups = this.selectionGroups.filter(sg => sg !== selectionGroupMatch)
    this.recommendations = removeRecommendations(selectionDefinitionIdentifiers, this.recommendations)

    const message = `\nExpected:\n - Select ${selectionBehaviorCode}: ${selectionDefinitionIdentifiers.join(
      ', '
    )}\nBut found:\n ${
      isEmpty(this.selectionGroups)
        ? '- No remaining selection groups'
        : this.selectionGroups?.map(
            (sg) =>
              `- Select ${sg.selectionCode}: ${sg.definitions.join(', ')}\n`
          )
    }`

    assert(selectionGroupMatch, message)
  }
)

// Then(
//   'select {string} of the following actions should be present',
//   function (
//     this: TestContext,
//     selectionBehaviorCode: string,
//     selectedActionIdentifiersTable: DataTable
//   ) {
//     const selectedActionIdentifiers: string[] =
//       selectedActionIdentifiersTable
//         .raw()
//         .map((i) => i[0])
//         .sort()

//     const findSelectedAction = (
//       action: fhir4.RequestGroupAction[]
//     ): boolean => {
//       let isMatch = false
//       for (let i = 0; i < action.length && !isMatch; i++) {
//         let subAction = action[i]
//         if (
//           subAction.selectionBehavior &&
//           subAction.selectionBehavior === selectionBehaviorCode &&
//           subAction.action
//         ) {
//           isMatch = isActionMatch(subAction.action)
//         }
//         if (!isMatch && subAction.action) {
//           isMatch = findSelectedAction(subAction.action)
//         }
//       }
//       return isMatch
//     }

//     const isActionMatch = (
//       selectionGroupAction: fhir4.RequestGroupAction[]
//     ) => {
//       let isMatch = false
//       const selectionGroupTitles = selectionGroupAction
//         .map((subAction) => {
//           return subAction.title
//         })
//         .filter(notEmpty)
//       isMatch =
//         selectionGroupTitles.sort().toString() ===
//         selectedActionIdentifiers.sort().toString()
//       return isMatch
//     }

//     let isMatch = false
//     if (this.cpgResponse?.entry) {
//       for (let i = 0; i < this.cpgResponse.entry.length && !isMatch; i++) {
//         const resource = this.cpgResponse.entry[i]
//           .resource as fhir4.RequestGroup
//         isMatch = resource.action ? findSelectedAction(resource.action) : false
//       }
//     }

//     const message =
//     assert(isMatch, 'Unable to find a matching selection group')
//   }
// )

Then('no activites should have been recommended', function (this: TestContext) {
  const activityRecommendations = findRecommendationResources(this.recommendations)
  assert(
    isEmpty(activityRecommendations),
    `Found recommendations:\n- ${activityRecommendations?.join('\n- ')}`
  )
})

After(function (this: TestContext, scenario) {
  if (scenario?.result?.status === 'PASSED') {
    const activityRecommendations = findRecommendationResources(this.recommendations)
    assert(
      isEmpty(activityRecommendations),
      `Found remaining recommendations:\n- ${activityRecommendations?.join(
        '\n- '
      )}`
    )
  }
})
