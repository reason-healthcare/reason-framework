## ADDED Requirements

### Requirement: /api/recommend route accepts a questionnaire item and returns a recommendation
The system SHALL expose a Next.js API route at `POST /api/recommend` inside `packages/cpg-review`.

The request body SHALL accept:
```ts
{
  item: fhir4.QuestionnaireItem
  context: fhir4.Bundle
  questionnaire?: fhir4.Questionnaire
}
```

The response SHALL always return HTTP 200 with a JSON body of shape `RecommendationResponse`:
```ts
{
  recommendedAnswer: string
  rationale: string
  confidence: number   // 0.0–1.0
  error?: string
}
```

On provider failure or timeout, the route SHALL return HTTP 200 with `error` populated and `recommendedAnswer` as an empty string, so the UI always receives a consistent envelope.

#### Scenario: Successful recommendation call
- **WHEN** a valid POST body is sent to `/api/recommend`
- **THEN** the route returns HTTP 200 with non-empty `recommendedAnswer`, `rationale`, and a `confidence` between 0 and 1

#### Scenario: Missing required fields
- **WHEN** the POST body is missing `item` or `context`
- **THEN** the route returns HTTP 400 with a descriptive error message

#### Scenario: Provider times out
- **WHEN** the LLM provider does not respond within 10 seconds
- **THEN** the route returns HTTP 200 with `error` set to a timeout message and `recommendedAnswer` as an empty string

#### Scenario: Provider throws an unexpected error
- **WHEN** the LLM provider throws during the `recommend` call
- **THEN** the route returns HTTP 200 with `error` populated and does not expose internal stack traces to the client

### Requirement: Local runtime configuration is supported for the provider
The system SHALL support local provider configuration via server-side environment variables (for example `OLLAMA_BASE_URL` and `OLLAMA_MODEL`).

#### Scenario: Local runtime is available
- **WHEN** the configured local model runtime is reachable and the configured model is available
- **THEN** the route initialises the local provider and proceeds with the recommendation call

#### Scenario: Local runtime is unavailable
- **WHEN** the local model runtime is unreachable or misconfigured
- **THEN** the route returns HTTP 200 with `error` populated and does not expose internal stack traces
