import {
  BaseRenderer,
  RendererThemeProvider,
  useBuildForm,
  useRendererQueryClient,
} from '@aehrc/smart-forms-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoadIndicator from '../LoadIndicator'

interface ReadOnlyQuestionnaireRendererProps {
  questionnaire: fhir4.Questionnaire
}

const ReadOnlyQuestionnaireRenderer = ({
  questionnaire,
}: ReadOnlyQuestionnaireRendererProps) => {
  const isBuilding = useBuildForm({
    questionnaire,
    readOnly: true,
    rendererConfigOptions: {
      readOnlyVisualStyle: 'readonly',
    },
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
