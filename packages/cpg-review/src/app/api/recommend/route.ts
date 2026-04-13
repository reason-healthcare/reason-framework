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

  console.warn('[API] Chunk failed, falling back to split', {
    itemCount: items.length,
    error: chunkResponse.error,
  })

  if (items.length === 1) {
    console.log('[API] Single item - returning error envelope', { linkId: items[0].linkId })
    return {
      [items[0].linkId]: errorEnvelope(chunkResponse.error),
    }
  }

  const midpoint = Math.ceil(items.length / 2)
  const leftItems = items.slice(0, midpoint)
  const rightItems = items.slice(midpoint)

  console.log('[API] Splitting chunk for retry', {
    originalSize: items.length,
    leftSize: leftItems.length,
    rightSize: rightItems.length,
  })

  const leftResults = await resolveChunkWithFallback(provider, leftItems, context, questionnaire)
  const rightResults = await resolveChunkWithFallback(provider, rightItems, context, questionnaire)

  return {
    ...leftResults,
    ...rightResults,
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestStartTime = Date.now()
  let body: Partial<RecommendationBatchRequest>

  console.log('[API] /api/recommend - Request received')

  try {
    body = (await req.json()) as Partial<RecommendationBatchRequest>
  } catch {
    console.error('[API] /api/recommend - Invalid JSON body')
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.context || !Array.isArray(body.items) || body.items.length === 0) {
    console.error('[API] /api/recommend - Missing required fields', {
      hasContext: !!body.context,
      itemsIsArray: Array.isArray(body.items),
      itemsLength: Array.isArray(body.items) ? body.items.length : 0,
    })
    return NextResponse.json(
      { message: 'Request body must include "context" and a non-empty "items" array.' },
      { status: 400 }
    )
  }

  const batchValidationError = validateBatchItems(body.items)
  if (batchValidationError) {
    console.error('[API] /api/recommend - Batch validation failed', { error: batchValidationError })
    return NextResponse.json({ message: batchValidationError }, { status: 400 })
  }

  const configuredModel = process.env.OLLAMA_MODEL?.trim()
  if (!configuredModel) {
    console.warn('[API] /api/recommend - OLLAMA_MODEL not configured, returning error envelopes')
    const recommendations = Object.fromEntries(
      body.items.map((item) => [item.linkId, errorEnvelope('LLM provider not configured')])
    )
    return NextResponse.json({ recommendations } satisfies RecommendationBatchResponse, { status: 200 })
  }

  console.log('[API] /api/recommend - Processing request', {
    itemCount: body.items.length,
    linkIds: body.items.map((item) => item.linkId),
    model: configuredModel,
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'default',
    questionnaireTitle: body.questionnaire?.title,
  })

  const provider = new OllamaProvider(process.env.OLLAMA_BASE_URL, configuredModel)
  const recommendations: RecommendationBatchResponse['recommendations'] = {}
  const chunkSize = configuredChunkSize()

  const chunks = Array.from(chunkItems(body.items, chunkSize))
  console.log('[API] /api/recommend - Split into chunks', {
    totalItems: body.items.length,
    chunkSize,
    chunkCount: chunks.length,
  })

  let chunkIndex = 0
  for (const itemChunk of chunks) {
    console.log(`[API] /api/recommend - Processing chunk ${chunkIndex + 1}/${chunks.length}`, {
      chunkSize: itemChunk.length,
      linkIds: itemChunk.map((item) => item.linkId),
    })
    const chunkRecommendations = await resolveChunkWithFallback(
      provider,
      itemChunk,
      body.context as fhir4.Bundle,
      body.questionnaire
    )
    Object.assign(recommendations, chunkRecommendations)
    chunkIndex++
  }

  const totalLatencyMs = Date.now() - requestStartTime
  console.log('[API] /api/recommend - Request completed', {
    totalItems: body.items.length,
    totalLatencyMs,
    successCount: Object.values(recommendations).filter((r) => !r.error).length,
    errorCount: Object.values(recommendations).filter((r) => r.error).length,
  })

  return NextResponse.json({ recommendations } satisfies RecommendationBatchResponse, { status: 200 })
}
