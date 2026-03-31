import { OllamaProvider } from 'llm/OllamaProvider'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('llm/OllamaProvider', () => ({
  OllamaProvider: jest.fn(),
}))

describe('/api/recommend route', () => {
  let POST: typeof import('api/recommend/route').POST
  const recommendChunkMock = jest.fn()

  beforeAll(async () => {
    ;({ POST } = await import('api/recommend/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OLLAMA_MODEL = 'mistral:7b'
    process.env.RECOMMENDATION_CHUNK_SIZE = '5'

    ;(OllamaProvider as jest.Mock).mockImplementation(() => ({
      recommendChunk: recommendChunkMock,
    }))
  })

  it('returns 400 when batch request has duplicate linkIds', async () => {
    const req = {
      json: async () => ({
        context: { resourceType: 'Bundle', type: 'collection', entry: [] },
        items: [
          { linkId: 'dup', text: 'Q1', type: 'string' },
          { linkId: 'dup', text: 'Q2', type: 'string' },
        ],
      }),
    } as any

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.message).toContain('Duplicate linkId')
  })

  it('returns deterministic linkId-keyed results for batch mode', async () => {
    recommendChunkMock.mockResolvedValueOnce({
      recommendations: {
        'item-1': { recommendedAnswer: 'A1', rationale: 'R1', confidence: 0.9 },
        'item-2': { recommendedAnswer: 'A2', rationale: 'R2', confidence: 0.8 },
      },
    })

    const req = {
      json: async () => ({
        context: { resourceType: 'Bundle', type: 'collection', entry: [] },
        questionnaire: { resourceType: 'Questionnaire', status: 'active', id: 'q1' },
        items: [
          { linkId: 'item-1', text: 'Q1', type: 'string' },
          { linkId: 'item-2', text: 'Q2', type: 'string' },
        ],
      }),
    } as any

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.recommendations['item-1'].recommendedAnswer).toBe('A1')
    expect(body.recommendations['item-2'].recommendedAnswer).toBe('A2')
    expect(recommendChunkMock).toHaveBeenCalledTimes(1)
  })

  it('preserves per-item error envelopes in batch mode', async () => {
    recommendChunkMock.mockResolvedValueOnce({
      recommendations: {
        'item-1': { recommendedAnswer: 'A1', rationale: 'R1', confidence: 0.9 },
        'item-2': { recommendedAnswer: '', rationale: '', confidence: 0, error: 'failed' },
      },
    })

    const req = {
      json: async () => ({
        context: { resourceType: 'Bundle', type: 'collection', entry: [] },
        items: [
          { linkId: 'item-1', text: 'Q1', type: 'string' },
          { linkId: 'item-2', text: 'Q2', type: 'string' },
        ],
      }),
    } as any

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.recommendations['item-1'].error).toBeUndefined()
    expect(body.recommendations['item-2'].error).toBe('failed')
  })

  it('applies chunk boundaries when processing large batches', async () => {
    recommendChunkMock.mockImplementation(async ({ items }: { items: fhir4.QuestionnaireItem[] }) => ({
      recommendations: Object.fromEntries(
        items.map((item) => [
          item.linkId,
          { recommendedAnswer: `A-${item.linkId}`, rationale: 'ok', confidence: 0.5 },
        ])
      ),
    }))

    const items = Array.from({ length: 11 }).map((_, index) => ({
      linkId: `item-${index + 1}`,
      text: `Question ${index + 1}`,
      type: 'string',
    }))

    const req = {
      json: async () => ({
        context: { resourceType: 'Bundle', type: 'collection', entry: [] },
        items,
      }),
    } as any

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(recommendChunkMock).toHaveBeenCalledTimes(3)
    expect(Object.keys(body.recommendations)).toHaveLength(11)
  })

  it('falls back to smaller chunks when a chunk response is malformed and preserves successful chunks', async () => {
    recommendChunkMock
      .mockResolvedValueOnce({
        recommendations: {
          'item-1': { recommendedAnswer: 'A1', rationale: 'R1', confidence: 0.9 },
          'item-2': { recommendedAnswer: 'A2', rationale: 'R2', confidence: 0.9 },
          'item-3': { recommendedAnswer: 'A3', rationale: 'R3', confidence: 0.9 },
          'item-4': { recommendedAnswer: 'A4', rationale: 'R4', confidence: 0.9 },
          'item-5': { recommendedAnswer: 'A5', rationale: 'R5', confidence: 0.9 },
        },
      })
      .mockResolvedValueOnce({ recommendations: {}, error: 'invalid chunk json' })
      .mockResolvedValueOnce({
        recommendations: {
          'item-6': { recommendedAnswer: 'A6', rationale: 'R6', confidence: 0.9 },
        },
      })
      .mockResolvedValueOnce({ recommendations: {}, error: 'still invalid' })

    const req = {
      json: async () => ({
        context: { resourceType: 'Bundle', type: 'collection', entry: [] },
        items: Array.from({ length: 7 }).map((_, index) => ({
          linkId: `item-${index + 1}`,
          text: `Question ${index + 1}`,
          type: 'string',
        })),
      }),
    } as any

    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.recommendations['item-1'].recommendedAnswer).toBe('A1')
    expect(body.recommendations['item-6'].recommendedAnswer).toBe('A6')
    expect(body.recommendations['item-7'].error).toBeDefined()
    expect(recommendChunkMock).toHaveBeenCalledTimes(4)
  })
})
