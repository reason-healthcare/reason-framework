import { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse, NextRequest } from 'next/server'
import FileResolver from 'resolver/file'
import Resolver from 'resolver/resolver'
import { is } from '../../helpers'

export async function GET(req: Request) {
  // TODO this should be middleware
  let resolver
  const { PATH_TO_CONTENT, PLAN_DEFINITION_IDENTIFIER } = process.env
  if (PATH_TO_CONTENT) {
    const contentEndpoint = {
      resourceType: 'Endpoint',
      address: PATH_TO_CONTENT,
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
    } as fhir4.Endpoint
    resolver = Resolver(contentEndpoint)
  } else {
    throw new Error('Must set content endpoint address')
  }

  if (!resolver) {
    throw new Error(
      `Unable to resolve content from endpoint ${PATH_TO_CONTENT}`
    )
  }

  let planDefinition
  if (PLAN_DEFINITION_IDENTIFIER) {
    const rawPlanDefinition = await resolver.resolveCanonical(
      PLAN_DEFINITION_IDENTIFIER
    )
    if (is.PlanDefinition(rawPlanDefinition)) {
      planDefinition = rawPlanDefinition
    }
  } else {
    throw new Error('Must set plan definition identifier')
  }

  if (!planDefinition) {
    throw new Error(
      `Unable to resolve plan definition with URL ${PLAN_DEFINITION_IDENTIFIER}`
    )
  }

  try {
    return NextResponse.json({ resolver, planDefinition })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
