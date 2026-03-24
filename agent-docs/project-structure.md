# Project Structure

## Monorepo Layout

This repository is an npm workspace monorepo with four packages:

- `packages/cds-service` — Fastify service exposing CDS Hooks and FHIR operation endpoints.
- `packages/cpg-execution` — Core CPG execution and resource resolution library.
- `packages/cpg-review` — Next.js UI for reviewing plan definitions and apply responses.
- `packages/cpg-test-support` — Cucumber-based integration/e2e test support.

TypeScript project references are defined at the root in `tsconfig.build.json`.

## Build Output Conventions

- Source code lives in `src/` folders.
- Compiled output is generated into `lib/` folders.
- `lib/` contents are build artifacts and should not be manually edited.

## API Surface (`cds-service`)

Primary server entrypoint is `packages/cds-service/src/server.ts`, and routes are defined in `packages/cds-service/src/app.ts`.

Key endpoints include:

- `GET /health`
- `GET /cds-services`
- `POST /cds-services/:id`
- `POST /ActivityDefinition/$apply`
- `POST /PlanDefinition/$apply`
- `POST /StructureDefinition/$questionnaire`
- `POST /PlanDefinition/$questionnaire`
- `POST /Questionnaire/$assemble`

## Execution Engine (`cpg-execution`)

Core public exports are rooted in `packages/cpg-execution/src/index.ts` and include logic for:

- Applying `ActivityDefinition` and `PlanDefinition`
- Questionnaire generation/assembly support
- Resource resolution and endpoint abstraction

The package contains corresponding tests and fixtures under `packages/cpg-execution/test/`.

## Testing Support (`cpg-test-support`)

Integration/e2e behavior tests are implemented with Cucumber:

- Feature files in `packages/cpg-test-support/features/`
- Step definitions in `packages/cpg-test-support/step_definitions/`
- Example Implementation Guide input under `packages/cpg-test-support/DevIG/`

## Review UI (`cpg-review`)

`packages/cpg-review` is a Next.js application used for visual review of CPG artifacts and apply results.

- App routes/components live under `packages/cpg-review/src/app/`
- Static assets live under `packages/cpg-review/public/`
