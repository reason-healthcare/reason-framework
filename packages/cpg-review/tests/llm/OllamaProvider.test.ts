import { OllamaProvider } from 'llm/OllamaProvider'

jest.mock('llm/buildRecommendationPrompt', () => ({
  buildRecommendationPrompt: jest.fn().mockResolvedValue('prompt'),
}))

describe('OllamaProvider', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('maps legacy numeric confidence responses into labels', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response:
          '{"recommendedAnswer":"Yes","rationale":"Strong direct support.","confidence":0.85}',
      }),
    } as Response)

    const provider = new OllamaProvider('http://127.0.0.1:11434', 'mistral:7b')
    const result = await provider.recommend({
      item: { linkId: 'item-1', text: 'Question', type: 'string' },
      context: { resourceType: 'Bundle', type: 'collection', entry: [] },
    })

    expect(result).toEqual({
      recommendedAnswer: 'Yes',
      rationale: 'Strong direct support.',
      confidence: 'high',
    })
  })
})
