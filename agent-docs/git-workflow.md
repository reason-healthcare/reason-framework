# Commit & Pull Request Guidelines

## Commits

- Use clear, scoped messages; Conventional Commits (e.g., `feat:`, `fix:`) are encouraged.
- Keep commits focused on a single logical change.

## Pull Requests

**Keep PRs concise and focused.** Long PRs create review bottlenecks and reduce team efficiency. Break large changes into smaller, reviewable chunks.

Every PR description must include these four sections:

### 1. What This Does

One or two sentences describing the change. Be specific about the problem solved or feature added.

**Example:**
> Adds package upload endpoint to support FHIR IG deployment via npm-style tarballs. Fixes authentication issues causing 401 errors during upload.

### 2. How to Test/Use

Clear, actionable steps for reviewers to verify the change works. Include:
- Specific commands to run
- URLs to visit
- Expected behavior/output
- Test data or fixtures to use

**Example:**
> ```bash
> ./bin/dev:start
> cd ui && curl -X POST http://localhost:3000/api/packages/upload \
>   -H "Authorization: Bearer <token>" \
>   -F "package=@../fixtures/FixtureIG/dist/fhir.fixture-ig-0.0.1.tgz" \
>   -F "orgName=test-org"
> # Expected: 200 OK with package metadata JSON
> ```

### 3. Impact to DX or Data

Describe changes that affect developer experience or require data migrations:
- New dependencies or environment variables (document in `.env.example`)
- Breaking API changes
- Database migrations required
- Configuration changes needed
- Performance implications

**Example:**
> - Requires `NPM_STORAGE_LOCAL_PATH` env var (documented in `.env.example`)
> - No data migration needed
> - Breaking: `/packages` endpoint now requires authentication

### 4. Summary of Changes

High-level bullet points of technical changes. Focus on architectural decisions, not line-by-line details.

**Example:**
> - Mounted `processPackageRouter` before body parsers in `app.ts`
> - Fixed `StorageFactory` import to use named export
> - Added StorageFactory mock for Jest tests
> - Updated bin/check to run embedding test

## PR Best Practices

- Link to related issues
- Include screenshots/recordings for UI changes
- Ensure tests pass and code is formatted (`./bin/check`)
- Keep diffs focused; avoid unrelated refactoring
- Update documentation when behavior changes
- Request review from specific team members when needed