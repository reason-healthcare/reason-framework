export interface RecommendationRequest {
  item: fhir4.QuestionnaireItem
  context: fhir4.Bundle
  questionnaire?: fhir4.Questionnaire
}

export interface RecommendationBatchRequest {
  items: fhir4.QuestionnaireItem[]
  context: fhir4.Bundle
  questionnaire?: fhir4.Questionnaire
}

export interface RecommendationChunkRequest extends RecommendationBatchRequest {}

export interface RecommendationResponse {
  recommendedAnswer: string
  rationale: string
  /** Confidence score in the range 0.0–1.0 */
  confidence: number
  error?: string
}

export interface RecommendationBatchResponse {
  recommendations: Record<string, RecommendationResponse>
}

export interface RecommendationChunkResponse {
  recommendations: Record<string, RecommendationResponse>
  error?: string
}
