'use server'

import { NextRequest, NextResponse } from 'next/server'

export interface ApplyPayload {
  dataPayload: string
  subjectPayload: string
  contentEndpointPayload: string
  txEndpointPayload: string
  planDefinition: fhir4.PlanDefinition
  questionnaire: fhir4.Questionnaire | undefined
}

export async function POST(req: NextRequest) {
  const {
    dataPayload,
    subjectPayload,
    contentEndpointPayload,
    txEndpointPayload,
    planDefinition,
    questionnaire
  } = (await req.json()) as ApplyPayload
  if (questionnaire != null) {
    const bundle: fhir4.Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [{
      fullUrl: `http://example.org/Questionnaire/${questionnaire.id}/${questionnaire.version}`,
      resource: questionnaire,
      request: {method:"PUT", url: `Questionnaire/${questionnaire.id}`}
      }]
    }
    try {
      const response = await fetch(
        'http://0.0.0.0:8080/fhir/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bundle),
        }
      )
    } catch (e) {
      console.log('Unable to post questionnaire')
    }
  }
  const parameters: fhir4.Parameters = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'planDefinition',
        resource: planDefinition,
      },
      {
        name: 'data',
        resource: JSON.parse(dataPayload) as fhir4.Bundle,
      },
      {
        name: 'subject',
        valueString: subjectPayload,
      },
      {
        name: 'contentEndpoint',
        resource: {
          resourceType: 'Endpoint',
          address: contentEndpointPayload,
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
            code: 'hl7-fhir-file',
          },
        },
      },
      {
        name: 'terminologyEndpoint',
        resource: {
          resourceType: 'Endpoint',
          address: txEndpointPayload,
          status: 'active',
          payloadType: [
            {
              coding: [
                {
                  code: 'terminology',
                },
              ],
            },
          ],
          connectionType: {
            code: 'hl7-fhir-file',
          },
        },
      },
    ],
  }
  try {
    const response = await fetch(
      'http://0.0.0.0:8080/fhir/PlanDefinition/$r5.apply',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters),
      }
    )


    const json = await response.json()

    if (!response.ok) {
      const message = `Error running $apply: ${JSON.stringify(json)}`
      console.error(message)
      return NextResponse.json({ message }, { status: response.status })
    }
    return NextResponse.json(json, { status: response.status })
  } catch (error) {
    const message = `Problem fetching FHIR package: ${error}`
    console.error(message)
    return NextResponse.json({ message }, { status: 500 })
  }
}
