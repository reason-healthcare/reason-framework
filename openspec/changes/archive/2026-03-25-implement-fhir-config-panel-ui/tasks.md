## 1. Create EndpointsConfiguration component

- [ ] 1.1 Create `packages/cpg-review/src/app/components/apply-form/EndpointsConfiguration.tsx` with props for the four `onChange` callbacks and a `onReset` imperative handle (via `useImperativeHandle`)
- [ ] 1.2 Define the `EndpointsConfig` TypeScript interface (`cpgEngineEndpoint`, `contentEndpoint`, `txEndpoint`, `dataEndpoint`) and export it from the component file
- [ ] 1.3 Implement `useState` for each of the four URL values, initializing from `localStorage.getItem('endpointsConfig')` JSON on mount with hardcoded defaults as fallback
- [ ] 1.4 Implement a `persistConfig` helper that writes the current four-value config object to `localStorage` under the key `endpointsConfig`
- [ ] 1.5 Call each corresponding `onChange` callback and `persistConfig` whenever an input value changes

## 2. Implement collapsible UI

- [ ] 2.1 Wrap the four URL inputs in an antd `Collapse` component with a single panel; default `activeKey` to `[]` (collapsed)
- [ ] 2.2 Set the panel header label to `Endpoints Configuration`
- [ ] 2.3 Render a collapsed-state URL summary string (e.g., `Data: <dataEndpoint>`) in the panel header's `extra` or as a sub-label visible when collapsed; derive it from current state at render time
- [ ] 2.4 Apply `text-overflow: ellipsis` and a `max-width` CSS rule to the collapsed summary to handle long URLs gracefully

## 3. Wire URL inputs inside the expanded panel

- [ ] 3.1 Add a labeled input for **Data Endpoint** with placeholder `http://localhost:8080/fhir` and description matching the current `ApplyForm` data endpoint description
- [ ] 3.2 Add a labeled input for **CPG Engine Endpoint** with placeholder `http://localhost:8080/fhir/PlanDefinition/$r5.apply`
- [ ] 3.3 Add a labeled input for **Content Endpoint** with placeholder `http://localhost:8080/fhir`
- [ ] 3.4 Add a labeled input for **Terminology Endpoint** with placeholder `http://localhost:8080/fhir`
- [ ] 3.5 Add a `// TODO(fhir-terminology-server-auth): extend endpointsConfig with auth credentials here` comment near the localStorage write so future auth work has a clear integration point

## 4. Integrate EndpointsConfiguration into ApplyForm

- [ ] 4.1 Remove the four standalone `Form.Item` endpoint blocks from `ApplyForm.tsx` (`data-endpoint`, `cpg-engine-endpoint`, `content-endpoint`, and the terminology endpoint item)
- [ ] 4.2 Add `<EndpointsConfiguration>` as the first `Form.Item` in the step-0 form, above `Patient Context`, passing `onChange` callbacks that update the corresponding state in `ApplyForm`
- [ ] 4.3 Keep the four `useState` declarations in `ApplyForm` (they are still needed to pass values to `handleApply`); initialize them from the `EndpointsConfiguration` callbacks rather than hardcoded defaults directly
- [ ] 4.4 Update `resetForm` in `ApplyForm` to call `localStorage.removeItem('endpointsConfig')` and reset the `EndpointsConfiguration` component state (via a `key` prop increment or `ref`-based reset method)

## 5. Tests

- [ ] 5.1 Create `packages/cpg-review/tests/EndpointsConfiguration.test.tsx`
- [ ] 5.2 Test: section is collapsed on initial render (URL inputs not visible)
- [ ] 5.3 Test: clicking the header expands the section and reveals URL inputs
- [ ] 5.4 Test: collapsed summary displays the current Data endpoint URL
- [ ] 5.5 Test: collapsed summary updates after a URL is changed and section is collapsed
- [ ] 5.6 Test: component reads initial values from `localStorage` on mount
- [ ] 5.7 Test: `localStorage` is updated when a URL input changes
- [ ] 5.8 Test: default values are shown when no `localStorage` entry exists
- [ ] 5.9 Test: `onChange` callback is called with the new value when an input changes
- [ ] 5.10 Verify no existing `ApplyForm` or `PatientLoadModeSwitcher` tests regress (`npx jest --no-coverage` in `cpg-review`)

## 6. Type check and cleanup

- [ ] 6.1 Run `npx tsc --noEmit` in `packages/cpg-review` and resolve any type errors
- [ ] 6.2 Remove any now-unused imports from `ApplyForm.tsx` (e.g., endpoint-related `Form.Item` references)
