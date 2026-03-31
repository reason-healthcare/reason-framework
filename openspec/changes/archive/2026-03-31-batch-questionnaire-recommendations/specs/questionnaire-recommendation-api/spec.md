## MODIFIED Requirements

### Requirement: /api/recommend route accepts recommendation requests and returns structured results
The system SHALL expose recommendation API behavior in `packages/cpg-review` that supports:
- single-item requests (`item` + `context` + optional `questionnaire`), and
- batch requests (`items[]` + `context` + optional `questionnaire`) for chunked recommendation processing.

Single-item responses SHALL remain compatible with `RecommendationResponse`.
Batch responses SHALL provide deterministic per-item results keyed by `linkId`.
Batch chunks SHALL be executed as one multi-item model invocation per chunk.

On provider failure or timeout, the route SHALL return HTTP 200 with error information populated in the relevant response envelope(s) rather than exposing internal stack traces.

#### Scenario: Successful single-item recommendation call
- **WHEN** a valid single-item POST body is sent to `/api/recommend`
- **THEN** the route returns HTTP 200 with non-empty `recommendedAnswer`, `rationale`, and a `confidence` between 0 and 1

#### Scenario: Successful batch recommendation call
- **WHEN** a valid batch POST body with `items[]` and `context` is sent to `/api/recommend` (or its batch mode)
- **THEN** the route returns HTTP 200 with deterministic recommendation entries keyed by each item `linkId`

#### Scenario: Malformed chunk output fallback
- **WHEN** a batch chunk returns malformed or schema-invalid output
- **THEN** the route applies fallback only to the failed chunk (smaller chunk retry or per-item fallback) and preserves successful chunk results

#### Scenario: Missing required fields
- **WHEN** the POST body is missing required recommendation fields (`context` and either `item` or non-empty `items[]`)
- **THEN** the route returns HTTP 400 with a descriptive error message

#### Scenario: Recommendation runtime timeout
- **WHEN** provider processing times out for a single item or for items in a chunk
- **THEN** the route returns HTTP 200 with timeout errors populated in the affected response envelope(s)

#### Scenario: Provider throws an unexpected error
- **WHEN** the LLM provider throws during recommendation processing
- **THEN** the route returns HTTP 200 with `error` populated in affected response envelope(s) and does not expose internal stack traces
