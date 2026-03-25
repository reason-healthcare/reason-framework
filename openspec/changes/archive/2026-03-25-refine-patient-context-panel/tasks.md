## 1. Segmented Mode Switcher

- [x] 1.1 Replace antd `Tabs` with antd `Segmented` in `PatientLoadModeSwitcher.tsx`; drive active panel via local state keyed to segment value (`'manual' | 'endpoint' | 'recent'`)
- [x] 1.2 Map the existing disabled+tooltip logic for the "FHIR Data Endpoint" option to the `Segmented` `options` array using the `disabled` field on the relevant option
- [x] 1.3 Verify sessionStorage persistence of active segment still works with the new component (key and values are unchanged)
- [x] 1.4 Remove the antd Tabs CSS overrides (active color, ink-bar, hover) from `applyForm.css` that are no longer needed; add any Segmented-specific teal color overrides required to match app style

## 2. Scrollable Recent Patients List

- [x] 2.1 Wrap the patient list in `RecentPatientsPanel.tsx` with a `div` styled with `max-height: 320px; overflow-y: auto`
- [x] 2.2 Confirm the "Clear history" action and patient count header remain outside (above) the scroll container so they are always visible

## 3. Tests

- [x] 3.1 Update `PatientLoadModeSwitcher.test.tsx`: replace any queries targeting antd Tabs (`role="tablist"`, `role="tab"`) with queries appropriate for the Segmented mock or rendered output
- [x] 3.2 Add a test to `RecentPatientsPanel.test.tsx` confirming the scroll container element is present in the DOM with the expected style/class
- [x] 3.3 Run full test suite and confirm all 41+ tests pass (42 passing)
