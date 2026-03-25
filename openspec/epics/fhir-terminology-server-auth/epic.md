# FHIR and Terminology Server Authentication

- **Slug:** `fhir-terminology-server-auth`
- **Status:** deferred
- **Priority:** medium
- **Owner:** cpg-review

## Summary
Define the architecture and implement authentication support for FHIR and terminology servers within `cpg-review` as a **UI-only, no-backend application**. This means all auth flows must execute entirely in the browser, credentials cannot be protected by an httpOnly cookie or server-side proxy, and the storage strategy must be chosen deliberately from the options the browser security model permits.

## Problem
`cpg-review` currently has no authentication mechanism for FHIR or terminology servers, limiting usage to open or locally-running servers. There is no configuration surface for supplying credentials. Because the app is UI-only with no backend, secure options like server-side proxy or httpOnly cookies are not available — the architecture must choose carefully from the browser-only patterns that trade off UX convenience against XSS exposure.

## Desired Outcomes
- Users can configure authentication credentials or tokens for a FHIR server and a terminology server entirely within the browser.
- The application injects those credentials transparently into outbound requests.
- A clear, written storage policy defines exactly where each credential type lives (memory, sessionStorage, or localStorage) and why.
- Non-secret config (server URLs, OAuth client IDs) persists across sessions via localStorage; secrets default to sessionStorage or memory-only with explicit user acknowledgement.

## In Scope
- Authentication architecture decision scoped to browser-only patterns. The viable options are:
  - **User-supplied bearer token or API key** — entered once in a config UI; stored in sessionStorage (persists within the tab session, gone on close/reload) or memory-only. Simplest path; works with any server that accepts a static token.
  - **OAuth 2.0 Authorization Code + PKCE** — redirect-based flow entirely in the browser for servers that support standard OAuth; access token held in memory; re-auth required on page reload without a backend to hold a refresh token.
  - **Open/unauthenticated** — always supported as a fallback for local or open servers.
- Credential storage policy: non-secret config (server URLs, OAuth client IDs, discovery endpoints) → localStorage; secrets (tokens, API keys) → sessionStorage as the default, with memory-only as the strict option.
- Configuration UI for supplying and managing server auth credentials within `cpg-review`.
- Auth header injection into FHIR and terminology server requests at a shared HTTP layer.
- Separate auth configuration per server (FHIR and terminology server may use different schemes).

## Out of Scope
- Backend-for-Frontend (BFF) proxy or Next.js API routes for credential proxying — this app is UI-only.
- Server-side session management or httpOnly cookie-based token storage.
- User identity and access management for the `cpg-review` application itself.
- Centralized secrets management infrastructure (Vault, AWS Secrets Manager, etc.).
- Multi-tenant or per-organization credential management.
- Certificate-based mutual TLS authentication.

## Candidate Changes
Use this table as the epic progress ledger. Update it when a change is proposed, implemented, or archived.

| Candidate Change | Summary | Why now | Readiness | Status | Linked Change | Notes |
|------------------|---------|---------|-----------|--------|---------------|-------|
| `design-server-auth-architecture` | Define the browser-only auth scheme options, select approach(es) for FHIR and terminology servers, and produce a written credential storage policy | Foundational blocker; all implementation depends on this decision | ready | not-started | `openspec/changes/design-server-auth-architecture` | Must cover: bearer token/API key vs OAuth PKCE vs open; sessionStorage vs memory-only for secrets; localStorage for non-secret config only |
| `implement-server-auth-config-ui` | Build config UI for entering and managing FHIR and terminology server auth credentials | Users cannot authenticate without a config surface | needs-design | not-started | `openspec/changes/implement-server-auth-config-ui` | Depends on architecture decision; include clear UX signalling when secrets are session-only and will not persist across reload |
| `implement-auth-header-injection` | Inject auth credentials from in-memory or sessionStorage into outbound FHIR and terminology HTTP requests at a shared layer | Ensures all requests use configured auth without per-call wiring | needs-design | not-started | `openspec/changes/implement-auth-header-injection` | Intercept at fetch layer; handle token-not-present state gracefully |
| `implement-oauth-pkce-flow` | Implement OAuth 2.0 Authorization Code + PKCE flow entirely in the browser for servers that support it | Only needed if a target server requires OAuth rather than a static token | blocked | not-started | `openspec/changes/implement-oauth-pkce-flow` | Blocked on architecture decision; only proceed if OAuth is selected; PKCE only — no client secret; access token in memory; re-auth on page reload |

## Dependencies
- FHIR server patient search work in `apply-form-patient-data-loading` epic — auth must be in place before live FHIR queries are practical in production.
- Terminology server usage in `cpg-execution` package — auth layer must be compatible with how terminology requests are made.
- Browser security model: localStorage, sessionStorage, and in-memory storage each have different persistence, XSS exposure, and tab-sharing characteristics that constrain the design.

## Risks
- Without a backend, there is no way to store secrets that are fully protected from JavaScript — sessionStorage is the practical floor for persistence, but it is still readable by JS and therefore XSS-susceptible.
- OAuth PKCE access tokens held in memory are lost on page reload; the user must re-authenticate, which may be disruptive for long sessions.
- FHIR server CORS configuration must allow browser-origin requests — without this, auth tokens cannot be used from the browser regardless of auth scheme.
- OAuth redirect flows interrupt SPA navigation; redirect-back state management must be handled explicitly if that path is chosen.
- Different FHIR and terminology servers may require different auth schemes, increasing configuration surface complexity.

## Open Questions
- Is re-authentication on page reload acceptable to users, or is sessionStorage persistence of tokens a required UX constraint?
- Should the UI display an explicit warning when a credential will not survive a page reload?
- Should the FHIR server auth config be co-located with the server URL config from the `apply-form-patient-data-loading` epic in a unified server settings panel?
- Which auth scheme do the primary target FHIR and terminology servers actually require — does this constrain the initial implementation?
- Should the app always support unauthenticated (open) servers as a no-config fallback?

## Notes
Because there is no backend, the storage tier map is fixed: **localStorage for non-secret config only** (server URLs, OAuth client IDs, discovery endpoints); **sessionStorage as the default for secrets** (tokens, API keys) — persists within a tab session, gone on close or reload, still JS-readable so XSS is a residual risk; **memory-only as the strict option** — zero persistence, re-entry required on every reload. The bearer token / API key path is the simplest first implementation and covers most non-SMART servers. OAuth PKCE is available as an optional flow for servers that require it but should not be assumed. The architecture design change must produce this storage policy in writing before implementation proceeds. This epic has a natural integration point with the FHIR server URL configuration in `apply-form-patient-data-loading` — a unified server settings panel should be considered.
