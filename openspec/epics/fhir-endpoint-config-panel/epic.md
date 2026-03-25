# FHIR Endpoint Configuration Panel

- **Slug:** `fhir-endpoint-config-panel`
- **Status:** proposed
- **Priority:** high
- **Owner:** cpg-review

## Summary
Replace the scattered FHIR endpoint URL inputs in the `cpg-review` apply form with a single inline collapsible section. When collapsed, the section displays a compact preview of the currently configured endpoint URLs so users always know what is set without expanding. When expanded, all four URL inputs are editable in place. Values persist across sessions via `localStorage`.

## Problem
The apply form today scatters FHIR endpoint URL inputs across the form body. They are always visible and fully expanded, adding noise for users who rarely change defaults. Values are not persisted so users must re-enter them on every page load. There is also a layout conflict risk when a second collapsible panel (for endpoint config) is added alongside the existing patient context panel.

## Desired Outcomes
- All FHIR server URL inputs are consolidated into a single inline collapsible section within the apply form.
- When collapsed, the section shows a compact read-only preview of the configured endpoint URLs (e.g., "Data: http://localhost:8080/fhir") so users can confirm what is active without expanding.
- Endpoint values persist across sessions so users do not re-enter them on every page load.
- The inline section coexists cleanly with the patient context panel without competing for layout space.
- The section integrates cleanly with the planned authentication layer from `fhir-terminology-server-auth` without requiring UI rework.

## In Scope
- Inline collapsible `Endpoints Configuration` section within the apply form (collapsed by default) containing editable inputs for:
  - CPG Engine endpoint (`$r5.apply` operation URL)
  - Content FHIR server URL
  - Terminology FHIR server URL
  - Data FHIR server URL
- Collapsed state renders a one-line read-only summary of the active URL values (e.g., "Data: http://localhost:8080/fhir") inline below the section header, giving users a quick-glance confirmation without expanding.
- Persistence of endpoint URLs in `localStorage` so values survive page reload (non-secret; follows the storage policy from `fhir-terminology-server-auth`).
- Visual treatment consistent with the existing apply form design system (Tailwind / shadcn/ui patterns in `cpg-review`).

## Out of Scope
- Authentication credential management (deferred to `fhir-terminology-server-auth` epic).
- Terminology server authentication or token injection (same deferral).
- Connection status probing or health checks against configured endpoints.
- Server-side configuration storage or multi-user config sync.
- Auto-discovery of FHIR server URLs.
- Changes to how apply requests are constructed or submitted (only the endpoint inputs change).

## Candidate Changes

| Candidate Change | Summary | Why now | Readiness | Status | Linked Change | Notes |
|------------------|---------|---------|-----------|--------|---------------|-------|
| `implement-fhir-config-panel-ui` | Build the inline collapsible `Endpoints Configuration` section with all four URL inputs, a collapsed URL-preview summary, and localStorage persistence | The current scattered URL fields add noise and lose values on reload; an inline collapsible section cleans this up without adding a second competing panel to the layout | ready | archived | `openspec/changes/archive/2026-03-25-implement-fhir-config-panel-ui` | Completed and archived 2026-03-25 |

## Dependencies
- Existing apply form architecture in `packages/cpg-review` — endpoint state currently lives in `ApplyForm.tsx` as `cpgEngineEndpointPayload`, `contentEndpointPayload`, `txEndpointPayload`, `dataEndpointPayload`.
- `apply-form-patient-data-loading` epic — the panel layout must not conflict with the patient context panel introduced there; both panels should coexist cleanly in the apply form layout.
- `fhir-terminology-server-auth` epic — the endpoint configuration panel is the natural future home for auth credential inputs; the component API should leave extension points for auth config fields without requiring a structural rewrite.
- Browser `localStorage` available in deployment context (same assumption as `apply-form-patient-data-loading`).

## Risks
- localStorage persistence of URLs increases the surface area of accidental credential leakage if users paste auth tokens directly into URL fields; placeholder text should discourage this until the auth layer is in place.
- The collapsed URL preview must truncate gracefully for long URLs on narrow screens without obscuring which endpoint is being shown.

## Open Questions
- Should the configuration panel be collapsed by default on every load, or remember its last open/closed state in localStorage?
- Should endpoint URL changes in the panel immediately propagate to the active apply form state, or require an explicit "Save" action within the panel?

## Notes
The four endpoint URL inputs in `ApplyForm.tsx` (`cpgEngineEndpointPayload`, `contentEndpointPayload`, `txEndpointPayload`, `dataEndpointPayload`) should be encapsulated in the new inline `EndpointsConfiguration` section component, which publishes the resolved URLs upward via callback props or a shared config context. The collapsed preview string should be derived from the active URL values at render time — no separate state is needed for it. This inline approach keeps the apply form layout flat (one collapsible region for endpoints, one for patient context) and avoids two autonomous panels stacking in the same visual tier.
