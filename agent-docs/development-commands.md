# Development Commands

## Prerequisites

- Node.js `20.19.0` or newer `20.x` (see `.tool-versions`).
- For Implementation Guide generation: Java 17, Ruby 3.1, and `fsh-sushi`.

## Root Commands

Run from repository root:

```bash
npm install
npm run build
npm run fmt
```

- Install dependencies from the monorepo root only. Running `npm install` inside individual workspace packages can leave package-local `node_modules` in a broken state.
- `npm run build` cleans package `lib/` outputs and builds TypeScript project references.
- `npm run fmt` runs each workspace package formatter.

## Package Commands

### `packages/cds-service`

```bash
npm run dev      # ts-node server from src/server.ts
npm run build    # compile to lib/
npm run server   # run lib/server.js
```

### `packages/cpg-execution`

```bash
npm run build
npm run test     # jest ./test
npm run lint
npm run ig       # build/prepare example IG assets
```

### `packages/cpg-review`

```bash
npm run dev      # Next.js dev server on localhost:3000
npm run build
npm run start
```

Run `cpg-review` package tests from the repository root via npm workspaces:

```bash
npm test --workspace @reason-framework/cpg-review -- --no-coverage
npm test --workspace @reason-framework/cpg-review -- SelectedPatientPreviewCard --no-coverage
npm run test:watch --workspace @reason-framework/cpg-review
```

- Prefer the workspace commands above even when working inside `packages/cpg-review`.
- If tests fail with missing module errors after a package-local install, remove `packages/cpg-review/node_modules` and rerun `npm install` from the repository root.

### `packages/cpg-test-support`

```bash
npm run build
npm run test     # cucumber-js
```

## Local Run (CDS Service)

From `packages/cds-service`:

```bash
cp .env.example .env
npm run dev
```

Default service port is `9001` unless `PORT` is set.
