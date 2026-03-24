# Security and Configuration

## Secrets and Source Control

- Never commit secrets or private endpoint credentials.
- Root `.env` is gitignored; keep package-local `.env` files untracked as well.
- Use package `.env.example` files as templates when available.

## Environment File Locations

- `packages/cds-service/.env.example`
- `packages/cpg-review/.env.example`
- `packages/cpg-test-support/DevIG/.env.example`

Create local `.env` files per package where needed, and keep values environment-specific.

## Endpoint Safety

- This repository supports both `file://` and `http(s)://` endpoints for FHIR content resolution.
- Treat endpoint values as trusted configuration input; avoid using untrusted arbitrary paths/URLs.
- Prefer local fixture endpoints during development and explicit endpoint values in CI.

## Logging and Sensitive Data

- Avoid adding logs that print credentials, tokens, or full environment dumps.
- Keep debug logging controlled by explicit debug flags and disable verbose output in shared environments.

## Dependency and Runtime Hygiene

- Keep dependencies updated through normal maintenance windows.
- Run formatting/tests/build checks before merging changes that affect runtime configuration behavior.
- For containerized runs, pass endpoint configuration explicitly and avoid baking secrets into images.