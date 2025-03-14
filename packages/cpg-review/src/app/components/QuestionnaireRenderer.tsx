import {
  BaseRenderer,
  RendererThemeProvider,
  useBuildForm,
  useRendererQueryClient
} from '@aehrc/smart-forms-renderer'
import { QueryClientProvider } from '@tanstack/react-query'

interface QuestionnaireRendererProps {
  questionnaire: fhir4.Questionnaire
}

const QuestionnaireRenderer = ({ questionnaire }: QuestionnaireRendererProps) => {
  const queryClient = useRendererQueryClient()
  const isBuilding = useBuildForm(questionnaire)

  if (isBuilding) {
    return <div>Loading...</div>
  }
  console.log('here')

  return (
    // The RendererThemeProvider provides the default renderer theme based on Material UI
    <RendererThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BaseRenderer />
      </QueryClientProvider>
    </RendererThemeProvider>
  )
}

export default QuestionnaireRenderer