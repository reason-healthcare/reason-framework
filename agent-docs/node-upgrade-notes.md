# Node Upgrade Notes

## Current Status

- The repository baseline has been moved to Node.js `20.x` with `.tool-versions` set to `20.20.1`.
- Validation on Node `20.20.1` matched the current Node `18.17.0` baseline:
  - `npm ci` passed
  - root build passed
  - `@reason-framework/cpg-test-support` build/test passed
  - `@reason-framework/cpg-review` build passed
  - `@reason-framework/cpg-execution` tests were already failing before the upgrade and remained failing after the upgrade

## Dependency Follow-Up After the Node Upgrade

No dependency updates are strictly required to complete the Node 20 migration, because the currently passing build/test commands stayed green on Node `20.20.1`.

Recommended follow-up updates:

1. **Align `@types/node` with the new runtime**
   - `packages/cds-service/package.json` still uses `@types/node` `^16.10.3`.
   - `packages/cpg-review/package.json` already uses `@types/node` `^20`.
   - Recommendation: move `cds-service` to Node 20 typings so editor/type behavior matches the runtime baseline.

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
   - `packages/cpg-review/package.json` uses Next `14.1.3`, which is compatible with Node `>=18.17.0` and passed on Node 20.
   - The build emitted a stale Browserslist database warning, which is maintenance noise rather than a Node 20 blocker.

## Compatibility Notes Confirmed in This Repo

- `@cucumber/cucumber` supports Node `18 || >=20`, so the current version is compatible with the new baseline.
- `next@14.1.3` supports Node `>=18.17.0`, so Node 20 is within its supported range.
- `ts-standard` supports Node `>=16`, so the current linter/runtime range remains compatible with Node 20.

## Potential Breaking Changes To Watch During Node 18 -> 20 Migration

1. **Type/runtime skew**
   - Packages typed against older Node definitions may compile cleanly while missing newer runtime APIs or surfacing different overload behavior.
   - The main known mismatch is in `cds-service` (`@types/node` 16 vs runtime Node 20).

2. **`ts-jest` and TypeScript compatibility drift**
   - The current `cpg-execution` test stack is already outside the `ts-jest` tested TypeScript range.
   - Symptoms to watch for:
     - new compile-time test failures
     - transformer errors
     - changed module-resolution behavior inside tests

3. **Built-in Fetch / Web API overlap**
   - Node 20 includes built-in `fetch`, `Request`, `Response`, and `Headers`.
   - `packages/cpg-test-support/step_definitions/steps.ts` uses global `fetch` successfully today.
   - Watch for issues if future code mixes Node's built-in web APIs with `node-fetch` imports or mismatched typings.

4. **Native binary reinstall requirements**
   - `cpg-review` depends on Next/SWC optional binaries.
   - When changing Node major versions, architectures, or Docker base images, always reinstall dependencies with `npm ci` rather than reusing an older `node_modules` directory.

5. **TLS / remote endpoint strictness**
   - This codebase talks to remote FHIR endpoints in tests and resolver flows.
   - Node 20 can expose handshake or certificate issues that older environments tolerated.
   - If remote resolver behavior changes, check endpoint TLS compatibility before assuming application logic broke.

6. **`npm` major-version behavior changes**
   - Node 20 currently brings npm 10 in local validation.
   - Expect small differences in install output, peer dependency messaging, and lockfile metadata handling compared with npm 9.
   - Prefer `npm ci` in automation to keep installs reproducible.

## Practical Migration Checklist

- Run `npm ci` after switching Node versions.
- Do not reuse pre-Node-20 `node_modules` or Docker layers blindly.
- Gate the upgrade on commands that were already green before the migration.
- Treat `cpg-execution` failures as separate pre-existing work unless a new Node-only delta appears.
- If follow-up cleanup is desired, start with `@types/node` in `cds-service`, then evaluate `ts-jest` modernization.