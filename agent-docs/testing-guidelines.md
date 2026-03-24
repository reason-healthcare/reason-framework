# Testing Guidelines

## Testing Stack in This Repository

- `@reason-framework/cpg-execution` uses Jest (`ts-jest`) for unit and integration-style tests.
- `@reason-framework/cpg-test-support` uses Cucumber (`cucumber-js`) for behavior-level integration/e2e scenarios.
- There is no repository-standard Playwright or Vitest setup.

## Unit and Integration Tests (`cpg-execution`)

From `packages/cpg-execution`:

```bash
npm run test
```

Guidelines:

- Keep tests near existing patterns in `packages/cpg-execution/test/`.
- Prefer deterministic fixtures from `test/fixtures/` and questionnaire fixtures.
- Add focused tests for changes in apply logic, resolver behavior, and questionnaire handling.

## Cucumber Integration/E2E Tests (`cpg-test-support`)

From `packages/cpg-test-support`:

```bash
npm run build
npm run test
```

Prerequisites:

1. Build the repository (`npm run build` from root).
2. Generate IG output when required (`packages/cpg-test-support/DevIG/_genonce.sh`).
3. Ensure a compatible CPG server is running (default `http://127.0.0.1:9001`).
4. Configure endpoints via environment variables (see `environment-variables.md`).

## Service-Level Validation (`cds-service`)

When changing API routes or operation handling in `cds-service`:

- Run package build and local server startup (`npm run build`, `npm run dev`).
- Validate impacted endpoints with focused requests (for example via Postman collection under `postman/`).

## Change-Scoped Test Strategy

- Start with the smallest relevant package test command.
- If shared logic is touched, run additional package tests that consume that logic.
- For cross-package changes, finish with a root build:

```bash
npm run build
```
