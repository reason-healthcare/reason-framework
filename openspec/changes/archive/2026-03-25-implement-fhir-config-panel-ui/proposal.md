## Why

The apply form in `cpg-review` scatters four FHIR endpoint URL inputs across the form body, keeping them permanently visible and resetting them on every page load. This adds visual noise for users who rarely change defaults and forces repeated re-entry of URLs across sessions.

## What Changes

- Replace the four scattered endpoint URL inputs in `ApplyForm.tsx` with a single inline collapsible `Endpoints Configuration` section.
- When collapsed, the section renders a compact read-only summary of the currently active endpoint URLs so users can confirm what is configured at a glance.
- When expanded, all four URL inputs are editable in place (CPG Engine, Content, Data, Terminology endpoints).
- All four endpoint URL values are persisted to `localStorage` and restored on page load.
- URL values are published upward from the section component via callback props or a shared config context so the rest of the apply form continues to function as before.

## Capabilities

### New Capabilities

- `endpoints-configuration`: Inline collapsible section in the apply form that groups all four FHIR endpoint URL inputs, shows a collapsed URL-preview summary, and persists values via `localStorage`.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. -->

## Impact

- `packages/cpg-review/src/app/components/apply-form/ApplyForm.tsx` — endpoint state (`cpgEngineEndpointPayload`, `contentEndpointPayload`, `txEndpointPayload`, `dataEndpointPayload`) and their inline inputs are moved into the new `EndpointsConfiguration` component.
- New component: `packages/cpg-review/src/app/components/apply-form/EndpointsConfiguration.tsx`.
- `localStorage` gains a new key for persisted endpoint URLs (read on mount, written on change).
- No API changes; no impact on `cpg-execution`, `cds-service`, or `cpg-test-support`.
