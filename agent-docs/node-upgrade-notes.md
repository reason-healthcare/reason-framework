# Node Upgrade Notes

## Current Status

- The repository baseline is Node.js `22.x` with `.tool-versions` set to `22.22.1`.
- Node 22 is required after upgrading `@cucumber/cucumber` to `13.x`; Cucumber 13 supports Node `22 || 24 || >=26`, so Node 20 is no longer a valid baseline.
- After changing Node major versions, run a clean root install (`npm ci` or remove `node_modules` and run `npm install`) before validating commands.

## Dependency Follow-Up After the Node Upgrade

Recommended follow-up updates:

Recommended follow-up updates:

1. **Align `@types/node` with the new runtime**
   - `packages/cds-service/package.json` still uses `@types/node` `^16.10.3`.
   - `packages/cpg-review/package.json` still uses `@types/node` `^20`.
   - Recommendation: move package Node typings to Node 22 in a separate pass so editor/type behavior matches the runtime baseline.

2. **Modernize `ts-jest` / Jest-era test tooling in `cpg-execution`**
   - `packages/cpg-execution/package.json` uses `ts-jest` `^28.0.1`.
   - The current test run emits warnings that TypeScript `5.8.x` is not in the tested range for this `ts-jest` version.
   - Recommendation: update Jest-related tooling together in one pass if `cpg-execution` test work is resumed.

3. **Review older `ts-node` usage**
   - `packages/cds-service/package.json` uses `ts-node` `^10.9.1`.
   - `packages/cpg-test-support/package.json` uses `ts-node` `^10.9.2`.
   - These versions worked in current validation, so they are not upgrade blockers.
   - Recommendation: keep them for now unless you start changing runtime loaders, ESM settings, or local dev startup flows.

4. **Optional: refresh stale frontend/tooling dependencies during a separate maintenance pass**
   - `packages/cpg-review/package.json` uses Next 15, which supports Node 22.
   - The build can require network access for `next/font/google` unless fonts are made local.

## Compatibility Notes Confirmed in This Repo

- `@cucumber/cucumber@13` supports Node `22 || 24 || >=26`, so Node 22 is the lowest supported LTS baseline for the current dependency set.
- `next@15` supports Node 22.
- `ts-standard` supports Node `>=16`, so the current linter/runtime range remains compatible with Node 22.

## Potential Breaking Changes To Watch During Node 20 -> 22 Migration

1. **Type/runtime skew**
   - Packages typed against older Node definitions may compile cleanly while missing newer runtime APIs or surfacing different overload behavior.
   - Known mismatches: `cds-service` still uses Node 16 typings, and `cpg-review` still uses Node 20 typings.

2. **`ts-jest` and TypeScript compatibility drift**
   - The current `cpg-execution` test stack is already outside the `ts-jest` tested TypeScript range.
   - Symptoms to watch for:
     - new compile-time test failures
     - transformer errors
     - changed module-resolution behavior inside tests

3. **Built-in Fetch / Web API overlap**
   - Node 22 includes built-in `fetch`, `Request`, `Response`, and `Headers`.
   - `packages/cpg-test-support/step_definitions/steps.ts` uses global `fetch` successfully today.
   - Watch for issues if future code mixes Node's built-in web APIs with `node-fetch` imports or mismatched typings.

4. **Native binary reinstall requirements**
   - `cpg-review` depends on Next/SWC optional binaries.
   - When changing Node major versions, architectures, or Docker base images, always reinstall dependencies with `npm ci` rather than reusing an older `node_modules` directory.

5. **TLS / remote endpoint strictness**
   - This codebase talks to remote FHIR endpoints in tests and resolver flows.
   - Node 22 can expose handshake or certificate issues that older environments tolerated.
   - If remote resolver behavior changes, check endpoint TLS compatibility before assuming application logic broke.

6. **`npm` major-version behavior changes**
   - Expect small differences in install output, peer dependency messaging, and lockfile metadata handling compared with older npm versions.
   - Prefer `npm ci` in automation to keep installs reproducible.

## Practical Migration Checklist

- Run `npm ci` after switching Node versions.
- Do not reuse pre-Node-22 `node_modules` or Docker layers blindly.
- Gate the upgrade on commands that were already green before the migration.
- Treat `cpg-execution` failures as separate pre-existing work unless a new Node-only delta appears.
- If follow-up cleanup is desired, start with package `@types/node` alignment, then evaluate `ts-jest` modernization.
