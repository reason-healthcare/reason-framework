## Context

`ApplyForm.tsx` in `cpg-review` renders four FHIR endpoint URL inputs (`cpgEngineEndpointPayload`, `contentEndpointPayload`, `txEndpointPayload`, `dataEndpointPayload`) as standalone `Form.Item` blocks scattered across the form body. They are always fully visible, hardcoded to `localhost` defaults with no persistence, and reset on every page load. Users who run repeated apply cycles must re-enter all four URLs each session.

The `apply-form-patient-data-loading` epic introduced `PatientLoadModeSwitcher` as a peer section in the same form. Adding a second independent collapsible panel would create two competing collapsible regions at the same visual tier; an inline collapsible section avoids this by composing naturally within the existing form flow.

The app is a UI-only Next.js app with no backend. Ant Design (antd) is the primary component library. Styles use a mix of antd and custom CSS in `src/styles/`.

## Goals / Non-Goals

**Goals:**
- Encapsulate all four endpoint URL inputs in a single `EndpointsConfiguration` component that renders inline in `ApplyForm`.
- Default the section to collapsed; expand on user interaction.
- Render a read-only URL summary in the collapsed state so users can confirm active values without expanding.
- Persist all four URL values to `localStorage` under a dedicated key; restore on component mount.
- Publish resolved URL values upward to `ApplyForm` via `onChange` callbacks so the rest of the form is unaffected.

**Non-Goals:**
- Connection status probing or reachability checks.
- Authentication credential management (deferred to `fhir-terminology-server-auth`).
- Moving `PatientLoadModeSwitcher` or any other form section.
- Serverside or cross-device config storage.

## Decisions

### 1. Ant Design `Collapse` for collapsible behavior

**Decision:** Use `antd` `Collapse` (single panel, `accordion={false}`, controlled open state) for the collapsible section.

**Rationale:** Consistent with the existing antd usage throughout `cpg-review`. Provides accessible expand/collapse keyboard behavior out of the box. Using a custom `<details>`/`<summary>` would require manual accessibility work and diverge from the design system.

**Alternative considered:** shadcn/ui `Collapsible` — rejected because `cpg-review` uses antd, not shadcn/ui.

---

### 2. Component state initialized from `localStorage`; writes on change

**Decision:** `EndpointsConfiguration` owns internal state for the four URL values. On mount it reads from `localStorage` key `endpointsConfig` (JSON object). On each URL change it writes the full config object back to `localStorage`. Default fallback values (e.g., `http://localhost:8080/fhir`) are used when no persisted value exists.

**Rationale:** Keeps the persistence logic co-located with the component that owns the state. `ApplyForm` stays stateless for endpoint values — it receives current values via `onChange` callbacks and uses them only at submit time.

**Alternative considered:** Lift state to `ApplyForm` and persist from there — rejected because it would widen `ApplyForm`'s responsibilities further.

---

### 3. Collapsed summary derived from current state at render time

**Decision:** The collapsed panel header renders a one-line string built from the current URL values (e.g., `Data: http://localhost:8080/fhir`). No separate summary state is stored.

**Rationale:** The summary is always a pure function of the current URL values, so deriving it at render time eliminates any sync risk between the summary and the inputs.

---

### 4. `localStorage` key: `endpointsConfig`

**Decision:** Persist all four endpoint values as a single JSON object under the key `endpointsConfig` in `localStorage`.

**Rationale:** A single key is easier to clear and inspect than four separate keys. Consistent with the `applyPayload` pattern already used in `ApplyForm`. Non-secret (URLs only, no credentials).

---

### 5. Placement in `ApplyForm`: above `PatientLoadModeSwitcher`

**Decision:** Render `<EndpointsConfiguration>` as the first `Form.Item` in the step-0 form, above `Patient Context`.

**Rationale:** Endpoint configuration is infrastructure context that scopes all subsequent patient and apply interactions. Placing it first gives users a clear top-to-bottom flow: configure servers → select patient → apply.

## Risks / Trade-offs

- **Long URLs in collapsed preview** → truncate with CSS `text-overflow: ellipsis` and a fixed max-width; full value always visible on expand.
- **`localStorage` key collision with future auth config** → `fhir-terminology-server-auth` should extend the same `endpointsConfig` object (or a coordinated namespace) rather than introducing a separate key; leave a code comment flagging this.
- **Reset behavior** → `ApplyForm.resetForm` currently sets all four endpoint state values to `undefined`; after this change it should also clear `endpointsConfig` from `localStorage` and reset `EndpointsConfiguration` internal state via a `ref` or `key` prop reset to keep behavior consistent.
