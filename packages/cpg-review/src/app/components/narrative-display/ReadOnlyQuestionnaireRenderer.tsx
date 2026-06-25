import {
  BaseRenderer,
  RendererThemeProvider,
  useBuildForm,
  useRendererQueryClient,
} from '@aehrc/smart-forms-renderer'
import type { QItemOverrideComponentProps } from '@aehrc/smart-forms-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Select } from 'antd'
import LoadIndicator from '../LoadIndicator'

interface ReadOnlyQuestionnaireRendererProps {
  questionnaire: fhir4.Questionnaire
}

const INSPECTABLE_CHOICE_TYPES = new Set(['choice', 'open-choice'])

const getAnswerOptionLabel = (option: fhir4.QuestionnaireItemAnswerOption) => {
  if (option.valueCoding != null) {
    return option.valueCoding.display ?? option.valueCoding.code ?? ''
  }

  return (
    option.valueString ??
    option.valueInteger?.toString() ??
    option.valueDate ??
    option.valueTime ??
    option.valueReference?.display ??
    option.valueReference?.reference ??
    ''
  )
}

const getAnswerLabel = (answer: fhir4.QuestionnaireResponseItemAnswer) => {
  if (answer.valueCoding != null) {
    return answer.valueCoding.display ?? answer.valueCoding.code
  }

  return (
    answer.valueString ??
    answer.valueInteger?.toString() ??
    answer.valueDate ??
    answer.valueTime ??
    answer.valueReference?.display ??
    answer.valueReference?.reference
  )
}

const ReadOnlyChoiceDropdown = ({
  qItem,
  qrItem,
}: QItemOverrideComponentProps) => {
  const selectedAnswer =
    !Array.isArray(qrItem) && qrItem?.answer != null
      ? getAnswerLabel(qrItem.answer[0])
      : undefined
  const options = (qItem.answerOption ?? [])
    .map((option) => getAnswerOptionLabel(option))
    .filter((label) => label.length > 0)
    .map((label) => ({
      label,
      value: label,
      disabled: true,
    }))

  return (
    <div className="narrative-readonly-choice">
      <label
        className="narrative-readonly-choice-label"
        htmlFor={`narrative-choice-${qItem.linkId}`}
      >
        {qItem.text}
      </label>
      <Select
        id={`narrative-choice-${qItem.linkId}`}
        className="narrative-readonly-choice-select"
        options={options}
        value={selectedAnswer}
        placeholder="View answer options"
        onChange={() => undefined}
        popupMatchSelectWidth={false}
      />
    </div>
  )
}

const getChoiceOverrides = (
  items: fhir4.QuestionnaireItem[] | undefined
): Record<string, React.ComponentType<QItemOverrideComponentProps>> => {
  return (items ?? []).reduce<
    Record<string, React.ComponentType<QItemOverrideComponentProps>>
  >((overrides, item) => {
    if (INSPECTABLE_CHOICE_TYPES.has(item.type)) {
      overrides[item.linkId] = ReadOnlyChoiceDropdown
    }

    return {
      ...overrides,
      ...getChoiceOverrides(item.item),
    }
  }, {})
}

const makeNarrativeReadOnlyItems = (
  items: fhir4.QuestionnaireItem[] | undefined
): fhir4.QuestionnaireItem[] | undefined => {
  return items?.map((item) => {
    const childItems = makeNarrativeReadOnlyItems(item.item)
    const nextItem = { ...item }

    if (!['group', 'display'].includes(item.type)) {
      nextItem.readOnly = true
    }

    if (childItems != null) {
      nextItem.item = childItems
    }

    return nextItem
  })
}

const makeNarrativeQuestionnaire = (
  questionnaire: fhir4.Questionnaire
): fhir4.Questionnaire => ({
  ...questionnaire,
  item: makeNarrativeReadOnlyItems(questionnaire.item),
})

const ReadOnlyQuestionnaireRenderer = ({
  questionnaire,
}: ReadOnlyQuestionnaireRendererProps) => {
  const isBuilding = useBuildForm({
    questionnaire: makeNarrativeQuestionnaire(questionnaire),
    readOnly: false,
    rendererConfigOptions: {
      readOnlyVisualStyle: 'readonly',
    },
    qItemOverrideComponents: getChoiceOverrides(questionnaire.item),
  })
  const queryClient = useRendererQueryClient()

  if (isBuilding) {
    return <LoadIndicator />
  }

  return (
    <div className="narrative-questionnaire-renderer">
      <RendererThemeProvider>
        <QueryClientProvider client={queryClient as unknown as QueryClient}>
          <BaseRenderer />
        </QueryClientProvider>
      </RendererThemeProvider>
    </div>
  )
}

export default ReadOnlyQuestionnaireRenderer
