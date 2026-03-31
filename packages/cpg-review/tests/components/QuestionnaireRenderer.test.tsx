import React from 'react'
import { render } from '@testing-library/react'
import QuestionnaireRenderer from 'components/apply-form/QuestionnaireRenderer'

const mockRecommendationPanel = jest.fn((props: any) => (
  <div data-testid="recommendation-panel" data-props={JSON.stringify(props)} />
))

jest.mock('components/apply-form/RecommendationPanel', () => ({
  __esModule: true,
  default: (props: any) => mockRecommendationPanel(props),
}))

jest.mock('@aehrc/smart-forms-renderer', () => ({
  __esModule: true,
  BaseRenderer: () => <div data-testid="base-renderer" />,
  getResponse: jest.fn(() => ({ resourceType: 'QuestionnaireResponse', status: 'in-progress' })),
  RendererThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useBuildForm: jest.fn(() => false),
  useRendererQueryClient: jest.fn(() => ({})),
}))

jest.mock('@tanstack/react-query', () => ({
  __esModule: true,
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('QuestionnaireRenderer recommendation context wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('passes the provided data bundle as recommendation context and excludes questionnaire response context construction', () => {
    const questionnaire: fhir4.Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q-1',
      status: 'active',
      item: [{ linkId: '1', text: 'Question 1', type: 'string' }],
    }

    const questionnaireResponseServer: fhir4.QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      status: 'in-progress',
    }

    const recommendationContext: fhir4.Bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: 'p-1',
          },
        },
      ],
    }

    render(
      <QuestionnaireRenderer
        questionnaireResponseServer={questionnaireResponseServer}
        questionnaire={questionnaire}
        recommendationContext={recommendationContext}
        setUserQuestionnaireResponse={jest.fn()}
        setCurrentStep={jest.fn()}
        isApplying={false}
      />
    )

    expect(mockRecommendationPanel).toHaveBeenCalledTimes(1)

    const [firstCallArgs] = mockRecommendationPanel.mock.calls
    expect(firstCallArgs).toBeDefined()
    const recommendationPanelProps = firstCallArgs[0]
    expect(recommendationPanelProps.context).toEqual(recommendationContext)
    expect(recommendationPanelProps.questionnaire).toEqual(questionnaire)

    const includesQuestionnaireResponse =
      recommendationPanelProps.context.entry?.some(
        (entry: { resource?: fhir4.Resource }) =>
          entry.resource?.resourceType === 'QuestionnaireResponse'
      ) ?? false

    expect(includesQuestionnaireResponse).toBe(false)
  })
})
