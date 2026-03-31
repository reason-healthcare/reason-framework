import { RecommendationRequest, RecommendationResponse } from '../types/recommendation'

export interface LLMProvider {
  recommend(request: RecommendationRequest): Promise<RecommendationResponse>
}
