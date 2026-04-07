'use client'

import {
  BaseRenderer,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
  useRendererQueryClient,
} from '@aehrc/smart-forms-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Alert } from 'antd'
import LoadIndicator from '../LoadIndicator'
import ApplyButton from './ApplyButton'

interface QuestionnaireRendererProps {
  questionnaireResponseServer: fhir4.QuestionnaireResponse | undefined
  questionnaire: fhir4.Questionnaire | undefined
  onSubmitQuestionnaire: (response: fhir4.QuestionnaireResponse) => void
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
  isApplying: boolean
}

const QuestionnaireRenderer = ({
  questionnaireResponseServer,
  questionnaire,
  onSubmitQuestionnaire,
  setCurrentStep,
  isApplying,
}: QuestionnaireRendererProps) => {
  if (!questionnaire || !questionnaireResponseServer) {
    return (
      <Alert
        style={{ display: 'flex', gap: '0.8rem' }}
        message="Missing questionnaire"
        description="The server response did not contain a questionnaire and questionnaire response. This may occur if the server does not support questionnaire generation or if the plan definition does not have any actions with input data requirements."
        type="warning"
        showIcon
        action={
          <button
            className="button-secondary"
            type="button"
            onClick={() => setCurrentStep(2)}
            style={{ padding: '0.4rem 0.8rem' }}
          >
            Ok
          </button>
        }
      />
    )
  }

  const isBuilding = useBuildForm({
    questionnaire,
    questionnaireResponse: questionnaireResponseServer,
  })

  if (isBuilding) {
    return <LoadIndicator />
  }

  /**
   * Recursively copies answers from source items to target items
   * @param targetItems - The original items to preserve (except answers)
   * @param sourceItems - The items containing answers to copy
   * @returns The target items with answers copied from source
   * This is a workaround for a known smart forms issue: https://github.com/aehrc/smart-forms/issues/1801
   */
  function copyAnswersToItems(
    targetItems: any[] | undefined,
    sourceItems: any[] | undefined
  ): any[] | undefined {
    if (!targetItems) {
      return undefined
    }

    return targetItems.map((targetItem) => {
      // Find matching source item by linkId
      const sourceItem = sourceItems?.find(
        (s) => s.linkId === targetItem.linkId
      )

      // Create a copy of the target item
      const result = { ...targetItem }

      // Copy answer from source if it exists, otherwise remove it
      if (sourceItem?.definition) {
        result.definition = sourceItem.definition
      }

      // Recursively process nested items
      if (targetItem.item) {
        result.item = copyAnswersToItems(targetItem.item, sourceItem?.item)
      }

      return result
    })
  }

  /**
   * Copies answers from a source QuestionnaireResponse to a target QuestionnaireResponse
   * @param target - The original QuestionnaireResponse to preserve
   * @param source - The QuestionnaireResponse containing answers to copy
   * @returns A new QuestionnaireResponse with target's structure and source's answers
   */
  function copyQuestionnaireAnswers(target: any, source: any): any {
    return {
      ...target,
      item: copyAnswersToItems(target.item, source.item),
    }
  }

  const handleQuestionnaireSubmit = () => {
    const questionnaireResponse = getResponse() as fhir4.QuestionnaireResponse
    const fullQuestionnaireResponse = copyQuestionnaireAnswers(
      questionnaireResponse,
      questionnaire
    )
    onSubmitQuestionnaire(fullQuestionnaireResponse)
  }

  const queryClient = useRendererQueryClient()

  return (
    // The RendererThemeProvider provides the default renderer theme based on Material UI
    <RendererThemeProvider>
      <QueryClientProvider client={queryClient as unknown as QueryClient}>
        <BaseRenderer />
      </QueryClientProvider>
      <ApplyButton
        isApplying={isApplying}
        label="Confirm & Apply"
        onClick={handleQuestionnaireSubmit}
        style={{ width: '100%' }}
      />
    </RendererThemeProvider>
  )
}

export default QuestionnaireRenderer
