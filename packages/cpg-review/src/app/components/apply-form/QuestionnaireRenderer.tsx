import {
  BaseRenderer,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
  useRendererQueryClient,
} from '@aehrc/smart-forms-renderer'
import { QueryClientProvider } from '@tanstack/react-query'
import { message, Spin, Alert, Space } from 'antd'
import LoadIndicator from '../LoadIndicator'
import { LoadingOutlined } from '@ant-design/icons'

interface QuestionnaireRendererProps {
  questionnaireResponseServer: fhir4.QuestionnaireResponse | undefined
  questionnaire: fhir4.Questionnaire | undefined
  setUserQuestionnaireResponse: React.Dispatch<
    React.SetStateAction<fhir4.QuestionnaireResponse | undefined>
  >
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
  isApplying: boolean
}

const QuestionnaireRenderer = ({
  questionnaireResponseServer,
  questionnaire,
  setUserQuestionnaireResponse,
  setCurrentStep,
  isApplying,
}: QuestionnaireRendererProps) => {
  const queryClient = useRendererQueryClient()

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
      {isApplying ? (
        <button
          type="button"
          className={'button'}
          onClick={handleQuestionnaireSubmit}
          disabled
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              justifyContent: 'center',
            }}
          >
            Applying
            <Spin
              style={{ color: '#fff' }}
              indicator={<LoadingOutlined spin />}
              size="small"
            />
          </div>
        </button>
      ) : (
        <button
          type="button"
          className={'button'}
          onClick={handleQuestionnaireSubmit}
        >
          Confirm & Apply
        </button>
      )}
    </RendererThemeProvider>
  )
}

export default QuestionnaireRenderer
