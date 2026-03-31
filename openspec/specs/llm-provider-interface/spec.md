## ADDED Requirements

### Requirement: LLMProvider interface exists and is implemented by a local provider
The system SHALL define a TypeScript interface `LLMProvider` with a single async method `recommend(request: RecommendationRequest): Promise<RecommendationResponse>`.

A concrete local-provider class (for example `OllamaProvider`) SHALL implement `LLMProvider` using a local model runtime.

`RecommendationRequest` SHALL have the shape:
```ts
{
  item: fhir4.QuestionnaireItem
  context: fhir4.Bundle
  questionnaire?: fhir4.Questionnaire
}
```

`RecommendationResponse` SHALL have the shape:
```ts
{
  recommendedAnswer: string
  rationale: string
  confidence: number   // 0.0–1.0
  error?: string
}
```

#### Scenario: Local provider returns a valid recommendation
- **WHEN** `LLMProvider.recommend` is called with a valid `RecommendationRequest` against an available local model
- **THEN** it resolves with a `RecommendationResponse` containing non-empty `recommendedAnswer`, `rationale`, and a `confidence` value between 0 and 1

#### Scenario: Provider returns error envelope on API failure
- **WHEN** the local model runtime returns an error, is unavailable, or the request times out
- **THEN** `LLMProvider.recommend` resolves (does not throw) with a `RecommendationResponse` where `error` is a non-empty string and `recommendedAnswer` is empty

#### Scenario: Swapping provider requires no interface change
- **WHEN** a new class implementing `LLMProvider` is substituted in the API route
- **THEN** the rest of the system compiles and behaves correctly without modification
