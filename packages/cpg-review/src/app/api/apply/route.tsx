'use server'

import { NextRequest, NextResponse } from 'next/server'
import {
  toServerReachableEndpointUrl,
  toUserFacingEndpointText,
} from './endpointUrls'

const getQuestionnaireCanonical = (questionnaire: fhir4.Questionnaire) => {
  if (questionnaire.url != null) {
    return questionnaire.url
  }

  const fallbackUrl = `http://example.org/Questionnaire/${questionnaire.id}`
  return questionnaire.version != null
    ? `${fallbackUrl}|${questionnaire.version}`
    : fallbackUrl
}

export interface ApplyPayload {
  dataPayload: fhir4.Bundle | undefined
  subjectPayload: string
  cpgEngineEndpointPayload: string
  contentEndpointPayload: string
  txEndpointPayload: string
  dataEndpointPayload?: string
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
    dataEndpointPayload,
    planDefinition,
    questionnaire,
  } = (await req.json()) as ApplyPayload
  const serverCpgEngineEndpoint = toServerReachableEndpointUrl(
    cpgEngineEndpointPayload
  )
  const serverContentEndpoint = toServerReachableEndpointUrl(
    contentEndpointPayload
  )
  const serverTxEndpoint = toServerReachableEndpointUrl(txEndpointPayload)
  const serverDataEndpoint =
    dataEndpointPayload != null
      ? toServerReachableEndpointUrl(dataEndpointPayload)
      : undefined

  if (questionnaire != null) {
    const questionnaireCanonical = getQuestionnaireCanonical(questionnaire)
    const bundle: fhir4.Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          fullUrl: questionnaireCanonical,
          resource: questionnaire,
          request: { method: 'PUT', url: `Questionnaire/${questionnaire.id}` },
        },
      ],
    }
    try {
      const response = await fetch('http://0.0.0.0:8080/fhir/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bundle),
      })
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
      ...(dataPayload != null ? [{ name: 'data', resource: dataPayload }] : []),
      {
        name: 'subject',
        valueString: subjectPayload,
      },
      ...(serverDataEndpoint
        ? [
            {
              name: 'dataEndpoint',
              resource: {
                resourceType: 'Endpoint',
                address: serverDataEndpoint,
                status: 'active',
                payloadType: [
                  {
                    coding: [
                      {
                        code: 'data',
                      },
                    ],
                  },
                ],
                connectionType: {
                  code: 'hl7-fhir-rest',
                },
              } as fhir4.Endpoint,
            },
          ]
        : []),
      {
        name: 'contentEndpoint',
        resource: {
          resourceType: 'Endpoint',
          address: serverContentEndpoint,
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
          address: serverTxEndpoint,
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
    const response = await fetch(serverCpgEngineEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parameters),
    })

    const json = await response.json()

    if (!response.ok) {
      const message = toUserFacingEndpointText(
        `Error running $apply: ${JSON.stringify(json)}`
      )
      console.error(message)
      return NextResponse.json({ message }, { status: response.status })
    }
    return NextResponse.json(json, { status: response.status })
  } catch (error) {
    const message = toUserFacingEndpointText(
      `Problem fetching FHIR package: ${error}`
    )
    console.error(message)
    return NextResponse.json({ message }, { status: 500 })
  }
}
