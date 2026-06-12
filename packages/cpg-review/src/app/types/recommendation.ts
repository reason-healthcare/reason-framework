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

export type RecommendationConfidence = 'low' | 'medium' | 'high'

export interface RecommendationResponse {
  recommendedAnswer: string
  rationale: string
  /** Confidence label returned by the model or derived from legacy numeric output */
  confidence: RecommendationConfidence
  error?: string
}

export interface RecommendationBatchResponse {
  recommendations: Record<string, RecommendationResponse>
}

export interface RecommendationChunkResponse {
  recommendations: Record<string, RecommendationResponse>
  error?: string
}
