# Environment Variables

This repository uses package-scoped environment files. There is no single root `.env.example` for all packages.

## `packages/cds-service`

Template: `packages/cds-service/.env.example`

Primary variables:

- `ENDPOINT_ADDRESS` — Default content/data/terminology endpoint used by resolver logic.
- `CANONICAL_SEARCH_ROOT` — Enables canonical root search behavior in resolver.
- `VERBOSE` / `DEBUG` — Enables additional debug output paths.
- `PORT` — Server port (defaults to `9001` if unset).

Usage points:

- `packages/cds-service/src/server.ts`
- `packages/cds-service/src/app.ts`
- Resolver/execution behavior in `packages/cpg-execution/src/**`

## `packages/cpg-test-support` (including `DevIG`)

Template: `packages/cpg-test-support/DevIG/.env.example`

Variables used by Cucumber step definitions:

- `CPG_ENDPOINT` — CPG server base URL.
- `CONTENT_ENDPOINT` — Endpoint/path for content artifacts.
- `TERMINOLOGY_ENDPOINT` — Endpoint/path for terminology artifacts.
- `DATA_ENDPOINT` — Optional data endpoint (falls back to local output when unset).

Usage point:

- `packages/cpg-test-support/step_definitions/steps.ts`

## `packages/cpg-review`

Template: `packages/cpg-review/.env.example`

Documented variables:

- `PATH_TO_CONTENT`
- `PLAN_DEFINITION_IDENTIFIER`

Use this file for local review-tool configuration where applicable.

## Practices

- Keep `.env` files local and uncommitted.
- Prefer `.env.example` updates when introducing new configuration keys.
- Document defaults and fallbacks in code and package docs when adding variables.
