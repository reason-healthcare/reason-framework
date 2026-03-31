'use server'

import { NextRequest, NextResponse } from 'next/server'
import { OllamaProvider } from '../../llm/OllamaProvider'
import { chunkItems, DEFAULT_RECOMMENDATION_CHUNK_SIZE, normalizeChunkSize } from '../../llm/chunkItems'
import {
  RecommendationBatchRequest,
  RecommendationBatchResponse,
  RecommendationResponse,
} from '../../types/recommendation'

function errorEnvelope(error: string): RecommendationResponse {
  return {
    recommendedAnswer: '',
    rationale: '',
    confidence: 0,
    error,
  }
}

function configuredChunkSize(): number {
  const raw = Number(process.env.RECOMMENDATION_CHUNK_SIZE ?? DEFAULT_RECOMMENDATION_CHUNK_SIZE)
  return normalizeChunkSize(raw)
}

function validateBatchItems(items: fhir4.QuestionnaireItem[]): string | undefined {
  const seen = new Set<string>()

  for (const item of items) {
    const linkId = item.linkId?.trim()
    if (!linkId) {
      return 'Each item in "items" must include a non-empty "linkId".'
    }
    if (seen.has(linkId)) {
      return `Duplicate linkId detected: "${linkId}". Each item linkId must be unique.`
    }
    seen.add(linkId)
  }

  return undefined
}

async function resolveChunkWithFallback(
  provider: OllamaProvider,
  items: fhir4.QuestionnaireItem[],
  context: fhir4.Bundle,
  questionnaire: fhir4.Questionnaire | undefined
): Promise<Record<string, RecommendationResponse>> {
  const chunkResponse = await provider.recommendChunk({
    items,
    context,
    questionnaire,
  })

  if (!chunkResponse.error) {
    return chunkResponse.recommendations
  }

  if (items.length === 1) {
    return {
      [items[0].linkId]: errorEnvelope(chunkResponse.error),
    }
  }

  const midpoint = Math.ceil(items.length / 2)
  const leftItems = items.slice(0, midpoint)
  const rightItems = items.slice(midpoint)

  const leftResults = await resolveChunkWithFallback(provider, leftItems, context, questionnaire)
  const rightResults = await resolveChunkWithFallback(provider, rightItems, context, questionnaire)

  return {
    ...leftResults,
    ...rightResults,
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Partial<RecommendationBatchRequest>

  try {
    body = (await req.json()) as Partial<RecommendationBatchRequest>
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.context || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { message: 'Request body must include "context" and a non-empty "items" array.' },
      { status: 400 }
    )
  }

  const batchValidationError = validateBatchItems(body.items)
  if (batchValidationError) {
    return NextResponse.json({ message: batchValidationError }, { status: 400 })
  }

  const configuredModel = process.env.OLLAMA_MODEL?.trim()
  if (!configuredModel) {
    const recommendations = Object.fromEntries(
      body.items.map((item) => [item.linkId, errorEnvelope('LLM provider not configured')])
    )
    return NextResponse.json({ recommendations } satisfies RecommendationBatchResponse, { status: 200 })
  }

  const provider = new OllamaProvider(process.env.OLLAMA_BASE_URL, configuredModel)
  const recommendations: RecommendationBatchResponse['recommendations'] = {}
  const chunkSize = configuredChunkSize()

  for (const itemChunk of chunkItems(body.items, chunkSize)) {
    const chunkRecommendations = await resolveChunkWithFallback(
      provider,
      itemChunk,
      body.context as fhir4.Bundle,
      body.questionnaire
    )
    Object.assign(recommendations, chunkRecommendations)
  }

  return NextResponse.json({ recommendations } satisfies RecommendationBatchResponse, { status: 200 })
}
