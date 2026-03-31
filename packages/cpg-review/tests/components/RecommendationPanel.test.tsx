import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import RecommendationPanel from 'components/apply-form/RecommendationPanel'

const QUESTIONNAIRE: fhir4.Questionnaire = {
  resourceType: 'Questionnaire',
  id: 'q1',
  status: 'active',
  item: [
    { linkId: '1', text: 'What is the patient age?', type: 'integer' },
    { linkId: '2', text: 'Notes', type: 'display' },
    { linkId: '3', text: 'Category', type: 'group' },
  ],
}

const CONTEXT: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [],
}

function mockBatchFetch(recommendations: Record<string, object>) {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ recommendations }),
  } as Response)
}

afterEach(() => {
  jest.resetAllMocks()
})

describe('RecommendationPanel', () => {
  it('renders a recommended answer and rationale on success', async () => {
    mockBatchFetch({
      '1': { recommendedAnswer: '42', rationale: 'Based on clinical data.', confidence: 0.8 },
    })

    render(<RecommendationPanel questionnaire={QUESTIONNAIRE} context={CONTEXT} />)

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('Based on clinical data.')).toBeInTheDocument()
      expect(screen.getByText('80% confidence')).toBeInTheDocument()
    })

    const firstCallArgs = (global.fetch as jest.Mock).mock.calls[0]
    const requestBody = JSON.parse(firstCallArgs[1].body as string)
    expect(requestBody.context).toEqual(CONTEXT)
    expect(requestBody.questionnaire).toEqual(QUESTIONNAIRE)
    expect(requestBody.items).toEqual([
      { linkId: '1', text: 'What is the patient age?', type: 'integer' },
    ])
  })

  it('renders "Recommendation unavailable" when the response contains an error', async () => {
    mockBatchFetch({
      '1': {
        error: 'LLM provider not configured',
        recommendedAnswer: '',
        rationale: '',
        confidence: 0,
      },
    })

    render(<RecommendationPanel questionnaire={QUESTIONNAIRE} context={CONTEXT} />)

    await waitFor(() => {
      expect(screen.getByText('Recommendation unavailable')).toBeInTheDocument()
    })
  })

  it('does not call fetch for items with type "display" or "group"', async () => {
    const displayOnlyQuestionnaire: fhir4.Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q2',
      status: 'active',
      item: [
        { linkId: 'a', text: 'A note', type: 'display' },
        { linkId: 'b', text: 'A group', type: 'group' },
      ],
    }
    global.fetch = jest.fn()

    const { container } = render(
      <RecommendationPanel questionnaire={displayOnlyQuestionnaire} context={CONTEXT} />
    )

    expect(container.firstChild).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches recommendations for nested answerable items inside groups', async () => {
    mockBatchFetch({
      'nested-1': {
        recommendedAnswer: 'Nested answer',
        rationale: 'Nested rationale.',
        confidence: 0.9,
      },
    })

    const nestedQuestionnaire: fhir4.Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q-nested',
      status: 'active',
      item: [
        {
          linkId: 'group-1',
          text: 'Parent group',
          type: 'group',
          item: [
            {
              linkId: 'nested-1',
              text: 'Nested question',
              type: 'string',
            },
          ],
        },
      ],
    }

    render(<RecommendationPanel questionnaire={nestedQuestionnaire} context={CONTEXT} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Nested answer')).toBeInTheDocument()
      expect(screen.getByText('Nested rationale.')).toBeInTheDocument()
    })
  })

  it('renders a warning-coloured confidence tag for low-confidence results', async () => {
    mockBatchFetch({
      '1': { recommendedAnswer: 'Maybe', rationale: 'Uncertain.', confidence: 0.3 },
    })

    render(<RecommendationPanel questionnaire={QUESTIONNAIRE} context={CONTEXT} />)

    await waitFor(() => {
      expect(screen.getByText('30% confidence')).toBeInTheDocument()
    })

    // Ant Design renders the Tag with ant-tag-warning class when color="warning"
    const tag = screen.getByText('30% confidence').closest('.ant-tag')
    expect(tag).toHaveClass('ant-tag-warning')
  })

  it('submits multiple chunked requests and reconciles per-item results by linkId', async () => {
    const multiItemQuestionnaire: fhir4.Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q-many',
      status: 'active',
      item: Array.from({ length: 6 }).map((_, index) => ({
        linkId: `q-${index + 1}`,
        text: `Question ${index + 1}`,
        type: 'string' as const,
      })),
    }

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          recommendations: {
            'q-1': { recommendedAnswer: 'A1', rationale: 'R1', confidence: 0.8 },
            'q-2': { recommendedAnswer: 'A2', rationale: 'R2', confidence: 0.8 },
            'q-3': { recommendedAnswer: 'A3', rationale: 'R3', confidence: 0.8 },
            'q-4': { recommendedAnswer: 'A4', rationale: 'R4', confidence: 0.8 },
            'q-5': { recommendedAnswer: 'A5', rationale: 'R5', confidence: 0.8 },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          recommendations: {
            'q-6': { recommendedAnswer: 'A6', rationale: 'R6', confidence: 0.8 },
          },
        }),
      } as Response)

    render(<RecommendationPanel questionnaire={multiItemQuestionnaire} context={CONTEXT} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(screen.getByText('A6')).toBeInTheDocument()
      expect(screen.getByText('R6')).toBeInTheDocument()
    })
  })
})
