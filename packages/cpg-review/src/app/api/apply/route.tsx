'use server'

import { NextRequest, NextResponse } from 'next/server'

const handleLocalHost = (url: string) => {
  if (url.startsWith('http://localhost')) {
    return url.replace('http://localhost', 'http://127.0.0.1')
  }
  return url
}

const getQuestionnaireCanonical = (questionnaire: fhir4.Questionnaire) => {
  if (questionnaire.url != null) {
    return questionnaire.url
  }

  const fallbackUrl = `http://example.org/Questionnaire/${questionnaire.id}`
  return questionnaire.version != null
    ? `${fallbackUrl}|${questionnaire.version}`
    : fallbackUrl
}

const mergeQuestionnaireIntoDataPayload = (
  dataPayload: fhir4.Bundle | undefined,
  questionnaire: fhir4.Questionnaire | undefined
): fhir4.Bundle | undefined => {
  if (questionnaire == null) {
    return dataPayload
  }

  const questionnaireCanonical = getQuestionnaireCanonical(questionnaire)
  const baseBundle =
    dataPayload != null
      ? dataPayload
      : ({ resourceType: 'Bundle', type: 'collection', entry: [] } as fhir4.Bundle)

  const filteredEntries = (baseBundle.entry ?? []).filter(
    (entry) => entry.resource?.resourceType !== 'Questionnaire'
  )

  return {
    ...baseBundle,
    entry: [
      ...filteredEntries,
      {
        fullUrl: questionnaireCanonical,
        resource: questionnaire,
      },
    ],
  }
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
  const dataPayloadWithQuestionnaire = mergeQuestionnaireIntoDataPayload(
    dataPayload,
    questionnaire
  )
  if (questionnaire != null) {
    const questionnaireCanonical = getQuestionnaireCanonical(questionnaire)
    console.log('questionnaire full url', questionnaireCanonical)
    console.log('questionnaire url', questionnaire.url)
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
      console.log(response)
      const responseBody = await response.text()
      console.log(responseBody)
    } catch (e) {
      console.log('Unable to post questionnaire')
    }
  }
  console.log(
    'data',
    dataPayloadWithQuestionnaire?.entry?.map((e) => e.resource?.resourceType)
  )
  console.log(
    'questionnaire response submitted',
    dataPayloadWithQuestionnaire?.entry?.find(
      (e) => e.resource?.resourceType === 'QuestionnaireResponse'
    )?.resource?.questionnaire
  )
  const parameters: fhir4.Parameters = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'planDefinition',
        resource: planDefinition,
      },
      ...(dataPayloadWithQuestionnaire != null
        ? [{ name: 'data', resource: dataPayloadWithQuestionnaire }]
        : []),
      {
        name: 'subject',
        valueString: subjectPayload,
      },
      ...(dataEndpointPayload
        ? [
            {
              name: 'dataEndpoint',
              resource: {
                resourceType: 'Endpoint',
                address: dataEndpointPayload,
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
    const response = await fetch(handleLocalHost(cpgEngineEndpointPayload), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parameters),
    })

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
