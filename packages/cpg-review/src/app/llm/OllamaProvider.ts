import {
  RecommendationChunkRequest,
  RecommendationChunkResponse,
  RecommendationRequest,
  RecommendationResponse,
} from '../types/recommendation'
import { LLMProvider } from './LLMProvider'
import { buildBatchRecommendationPrompt } from './buildBatchRecommendationPrompt'
import { buildRecommendationPrompt } from './buildRecommendationPrompt'

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_MODEL = 'mistral:7b'
const RECOMMEND_TIMEOUT_MS = 100_000

interface OllamaGenerateResponse {
  response?: string
  error?: string
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Recommendation request failed'
}

function errorEnvelope(error: string): RecommendationResponse {
  return {
    recommendedAnswer: '',
    rationale: '',
    confidence: 0,
    error,
  }
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim()

  if (trimmed.startsWith('```')) {
    const withoutFenceHeader = trimmed.replace(/^```(?:json)?\s*/i, '')
    return withoutFenceHeader.replace(/\s*```$/, '').trim()
  }

  return trimmed
}

export class OllamaProvider implements LLMProvider {
  private readonly baseUrl: string
  private readonly model: string

  constructor(
    baseUrl: string = process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
    model: string = process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.model = model
  }

  async recommend(request: RecommendationRequest): Promise<RecommendationResponse> {
    const startTime = Date.now()
    const prompt = buildRecommendationPrompt(
      request.item,
      request.context,
      request.questionnaire
    )

    console.log('[LLM] Starting recommendation request', {
      linkId: request.item.linkId,
      itemText: request.item.text,
      itemType: request.item.type,
      model: this.model,
      baseUrl: this.baseUrl,
      promptLength: prompt.length,
    })

    console.log('[LLM] Full prompt:', '\n' + prompt + '\n')

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), RECOMMEND_TIMEOUT_MS)
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.2,
          },
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errorText = await res.text()
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Request failed', {
          linkId: request.item.linkId,
          status: res.status,
          latencyMs,
          errorText,
        })
        return {
          recommendedAnswer: '',
          rationale: '',
          confidence: 0,
          error: `Ollama request failed with status ${res.status}`,
        }
      }

      const data = (await res.json()) as OllamaGenerateResponse
    
      if (data.error) {
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Ollama returned error', {
          linkId: request.item.linkId,
          latencyMs,
          error: data.error,
        })
        return {
          recommendedAnswer: '',
          rationale: '',
          confidence: 0,
          error: data.error,
        }
      }

      const rawText = (data.response ?? '').trim()
      console.log('[LLM] Raw response:', '\n' + rawText + '\n')

      if (!rawText) {
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Empty response', { linkId: request.item.linkId, latencyMs })
        return {
          recommendedAnswer: '',
          rationale: '',
          confidence: 0,
          error: 'Ollama returned an empty response',
        }
      }

      const cleanedJson = extractJsonPayload(rawText)
      const parsed = JSON.parse(cleanedJson) as Partial<RecommendationResponse>
      const recommendedAnswer = (parsed.recommendedAnswer ?? '').toString().trim()
      const rationale = (parsed.rationale ?? '').toString().trim()
      const confidence = clampConfidence(parsed.confidence)

      if (!recommendedAnswer || !rationale) {
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Invalid recommendation payload', {
          linkId: request.item.linkId,
          latencyMs,
          parsed,
        })
        return {
          recommendedAnswer: '',
          rationale: '',
          confidence: 0,
          error: 'Provider returned an invalid recommendation payload',
        }
      }

      const latencyMs = Date.now() - startTime
      console.log('[LLM] Recommendation completed', {
        linkId: request.item.linkId,
        latencyMs,
        recommendedAnswer,
        confidence,
        rationaleLength: rationale.length,
      })

      return {
        recommendedAnswer,
        rationale,
        confidence,
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime

      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[LLM] Request timed out', {
          linkId: request.item.linkId,
          latencyMs,
          timeoutMs: RECOMMEND_TIMEOUT_MS,
        })
        return {
          recommendedAnswer: '',
          rationale: '',
          confidence: 0,
          error: 'Recommendation request timed out',
        }
      }

      console.error('[LLM] Unexpected error', {
        linkId: request.item.linkId,
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      return {
        recommendedAnswer: '',
        rationale: '',
        confidence: 0,
        error: safeErrorMessage(error),
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  async recommendChunk(request: RecommendationChunkRequest): Promise<RecommendationChunkResponse> {
    const startTime = Date.now()
    const prompt = buildBatchRecommendationPrompt(
      request.items,
      request.context,
      request.questionnaire
    )

    const linkIds = request.items.map((item) => item.linkId)
    console.log('[LLM] Starting batch recommendation request', {
      itemCount: request.items.length,
      linkIds,
      model: this.model,
      baseUrl: this.baseUrl,
      promptLength: prompt.length,
    })

    console.log('[LLM] Full batch prompt:', '\n' + prompt + '\n')

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), RECOMMEND_TIMEOUT_MS)

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.2,
          },
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errorText = await res.text()
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Batch request failed', {
          itemCount: request.items.length,
          linkIds,
          status: res.status,
          latencyMs,
          errorText,
        })
        return {
          recommendations: {},
          error: `Ollama request failed with status ${res.status}: ${errorText}`,
        }
      }

      const data = (await res.json()) as OllamaGenerateResponse
      if (data.error) {
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Batch - Ollama returned error', {
          itemCount: request.items.length,
          linkIds,
          latencyMs,
          error: data.error,
        })
        return {
          recommendations: {},
          error: data.error,
        }
      }

      const rawText = (data.response ?? '').trim()
      console.log('[LLM] Raw batch response:', '\n' + rawText + '\n')

      if (!rawText) {
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Batch - Empty response', {
          itemCount: request.items.length,
          linkIds,
          latencyMs,
        })
        return {
          recommendations: {},
          error: 'Ollama returned an empty response',
        }
      }

      const parsed = JSON.parse(extractJsonPayload(rawText)) as unknown
      const parsedObject =
        typeof parsed === 'object' && parsed !== null
          ? (parsed as {
              recommendations?: Record<string, Partial<RecommendationResponse>>
            } & Record<string, Partial<RecommendationResponse>>)
          : undefined

      const recommendationMap: Record<string, Partial<RecommendationResponse>> | undefined =
        parsedObject?.recommendations ?? parsedObject

      if (!recommendationMap || typeof recommendationMap !== 'object') {
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Batch - Invalid payload structure', {
          itemCount: request.items.length,
          linkIds,
          latencyMs,
          parsed: parsedObject,
        })
        return {
          recommendations: {},
          error: 'Provider returned invalid batch recommendation payload',
        }
      }

      const recommendations: RecommendationChunkResponse['recommendations'] = {}
      let matchedCount = 0

      for (const item of request.items) {
        const candidate = recommendationMap[item.linkId]
        if (candidate) {
          matchedCount += 1
        }

        const recommendedAnswer = (candidate?.recommendedAnswer ?? '').toString().trim()
        const rationale = (candidate?.rationale ?? '').toString().trim()
        const confidence = clampConfidence(candidate?.confidence)

        if (!recommendedAnswer || !rationale) {
          recommendations[item.linkId] = errorEnvelope('Missing recommendation for item linkId')
        } else {
          recommendations[item.linkId] = {
            recommendedAnswer,
            rationale,
            confidence,
          }
        }
      }

      if (matchedCount === 0) {
        const latencyMs = Date.now() - startTime
        console.error('[LLM] Batch - No matching recommendations', {
          itemCount: request.items.length,
          linkIds,
          latencyMs,
          recommendationMap,
        })
        return {
          recommendations: {},
          error: 'Provider returned invalid batch recommendation payload',
        }
      }

      const latencyMs = Date.now() - startTime
      console.log('[LLM] Batch recommendation completed', {
        itemCount: request.items.length,
        matchedCount,
        linkIds,
        latencyMs,
        recommendations: Object.fromEntries(
          Object.entries(recommendations).map(([linkId, rec]) => [
            linkId,
            {
              recommendedAnswer: rec.recommendedAnswer,
              confidence: rec.confidence,
              rationaleLength: rec.rationale?.length ?? 0,
            },
          ])
        ),
      })

      return { recommendations }
    } catch (error) {
      const latencyMs = Date.now() - startTime

      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[LLM] Batch - Request timed out', {
          itemCount: request.items.length,
          linkIds,
          latencyMs,
          timeoutMs: RECOMMEND_TIMEOUT_MS,
        })
        return {
          recommendations: {},
          error: 'Recommendation request timed out',
        }
      }

      console.error('[LLM] Batch - Unexpected error', {
        itemCount: request.items.length,
        linkIds,
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      return {
        recommendations: {},
        error: safeErrorMessage(error),
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
