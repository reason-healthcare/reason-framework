# Development Commands

## Prerequisites

- Node.js `18.17.0` (see `.tool-versions`).
- For Implementation Guide generation: Java 17, Ruby 3.1, and `fsh-sushi`.

## Root Commands

Run from repository root:

```bash
npm install
npm run build
npm run fmt
```

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
