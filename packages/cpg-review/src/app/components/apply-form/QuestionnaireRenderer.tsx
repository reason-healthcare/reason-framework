import {
  BaseRenderer,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
  useRendererQueryClient,
} from '@aehrc/smart-forms-renderer'
import { QueryClientProvider } from '@tanstack/react-query'
import { message } from 'antd'
import LoadIndicator from '../LoadIndicator'
import { is } from 'helpers'

interface QuestionnaireRendererProps {
  questionnaireResponseServer: fhir4.QuestionnaireResponse
  questionnaire: fhir4.Questionnaire | undefined
  setUserQuestionnaireResponse: React.Dispatch<
    React.SetStateAction<fhir4.QuestionnaireResponse | undefined>
  >
}

const QuestionnaireRenderer = ({
  questionnaireResponseServer,
  questionnaire,
  setUserQuestionnaireResponse,
}: QuestionnaireRendererProps) => {

  const queryClient = useRendererQueryClient()

  if (!questionnaire) {
    message.error('Unable to display questionnaire')
    console.error(
      `Questionnaire not found in Questionnaire Response`,
      questionnaireResponseServer
    )
    return <></>
  }

  const isBuilding = useBuildForm(questionnaire, questionnaireResponseServer)


  if (isBuilding) {
    return <LoadIndicator />
  }

  const handleQuestionnaireSubmit = () => {
    const questionnaireResponse = getResponse()
    setUserQuestionnaireResponse(questionnaireResponse)
  }

  return (
    // The RendererThemeProvider provides the default renderer theme based on Material UI
    <RendererThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BaseRenderer />
      </QueryClientProvider>
      <button
        type="button"
        className={'button'}
        onClick={handleQuestionnaireSubmit}
      >
        Confirm & Apply
      </button>
    </RendererThemeProvider>
  )
}

export default QuestionnaireRenderer
