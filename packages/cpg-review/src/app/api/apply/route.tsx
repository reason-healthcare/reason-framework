'use server'

import { NextRequest, NextResponse } from 'next/server'

const handleLocalHost = (url: string) => {
  if (url.startsWith('http://localhost')) {
    return url.replace('http://localhost', 'http://127.0.0.1')
  }
  return url
}

export interface ApplyPayload {
  dataPayload: string
  subjectPayload: string
  cpgEngineEndpointPayload: string
  contentEndpointPayload: string
  txEndpointPayload: string
  planDefinition: fhir4.PlanDefinition
  questionnaire: fhir4.Questionnaire | undefined
}

export async function POST(req: NextRequest) {
  const {
    dataPayload,
    subjectPayload,
    cpgEngineEndpointPayload,
    contentEndpointPayload,
    txEndpointPayload,
    planDefinition,
    questionnaire
  } = (await req.json()) as ApplyPayload
  console.log(JSON.stringify(planDefinition, null, 2))
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
            code: 'hl7-fhir-rest',
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
            code: 'hl7-fhir-rest',
          },
        },
      },
    ],
  }
  try {
    const response = await fetch(
      handleLocalHost(cpgEngineEndpointPayload),
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
    console.log(JSON.stringify(json, null, 2))
    return NextResponse.json(json, { status: response.status })
  } catch (error) {
    const message = `Problem fetching FHIR package: ${error}`
    console.error(message)
    return NextResponse.json({ message }, { status: 500 })
  }
}
