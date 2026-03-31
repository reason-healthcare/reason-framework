## ADDED Requirements

### Requirement: Batch recommendation API accepts multiple questionnaire items with shared context
The system SHALL provide a batch recommendation API contract that accepts multiple questionnaire items in one request with shared patient context.

The request SHALL include:
- `items`: non-empty array of questionnaire items
- `context`: patient context bundle
- `questionnaire` (optional): questionnaire metadata

#### Scenario: Valid batch request
- **WHEN** a batch request contains a non-empty `items` array and valid `context`
- **THEN** the system processes the request and returns per-item recommendation results

#### Scenario: Missing items array
- **WHEN** a batch request omits `items` or provides an empty array
- **THEN** the system returns HTTP 400 with a descriptive validation error

### Requirement: Batch responses use deterministic `linkId` keys
The system SHALL return recommendation results keyed deterministically by questionnaire item `linkId`.

Each result entry SHALL include `recommendedAnswer`, `rationale`, `confidence`, and optional `error`.

#### Scenario: Deterministic mapping for UI reconciliation
- **WHEN** batch recommendations are returned
- **THEN** each recommendation is accessible via its corresponding item `linkId` key

#### Scenario: Duplicate linkIds in request
- **WHEN** the request includes duplicate `linkId` values
- **THEN** the system returns HTTP 400 indicating linkId uniqueness is required

### Requirement: Batch processing is chunked with bounded chunk size
The system SHALL process recommendation items in bounded chunks rather than one unbounded giant prompt.

A default chunk size SHALL be configured in the 5–10 range, and implementations MAY allow overriding via internal configuration.
Each chunk SHALL be executed as one model invocation using a multi-item prompt with shared context.

#### Scenario: Request larger than chunk size
- **WHEN** the number of input items exceeds the configured chunk size
- **THEN** the system partitions items into multiple chunks and processes each chunk separately

#### Scenario: Request smaller than chunk size
- **WHEN** the number of input items is less than or equal to chunk size
- **THEN** the system processes the request as a single chunk

#### Scenario: One model invocation per chunk
- **WHEN** a chunk is submitted for recommendation generation
- **THEN** the system uses a single provider/model invocation for that chunk's multi-item prompt, not one invocation per item

### Requirement: Batch mode preserves per-item error isolation
The system SHALL preserve partial successes and per-item failures in batch responses.

#### Scenario: One item fails in a chunk
- **WHEN** one item response cannot be generated or parsed
- **THEN** only that item entry includes `error`, while other successful item entries are still returned

#### Scenario: Chunk-level runtime failure
- **WHEN** one chunk fails due to provider/runtime error
- **THEN** items in that failed chunk receive error entries and items from successful chunks are still returned

### Requirement: Chunk parse failures trigger bounded fallback
The system SHALL apply bounded fallback when chunk output is malformed or not parseable.

Fallback behavior SHALL split and retry only the failed chunk (or use per-item fallback for that failed chunk) while preserving successful chunk results.

#### Scenario: Malformed chunk output
- **WHEN** a chunk returns malformed JSON or schema-invalid output
- **THEN** the system retries only the failed chunk with smaller chunk size or per-item fallback, and preserves previously successful chunk entries

#### Scenario: Fallback exhausted
- **WHEN** fallback retries for a failed chunk are exhausted
- **THEN** only items in that chunk receive error envelopes and successful chunk items remain returned
