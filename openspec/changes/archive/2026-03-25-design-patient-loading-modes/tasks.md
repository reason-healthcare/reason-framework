## 1. fhirClient Abstraction Module

- [x] 1.1 Create `packages/cpg-review/src/lib/fhirClient.ts` module that accepts `endpointUrl` and request options, delegates to `fetch`, and returns parsed JSON
- [x] 1.2 Add typed request options interface to `fhirClient` covering `path`, `params`, and future `headers` slot (for auth migration)
- [x] 1.3 Add error handling in `fhirClient` for network errors, CORS failures, and non-2xx HTTP responses, returning a typed error result
- [x] 1.4 Write unit tests for `fhirClient` covering success, network error, CORS error, and 4xx/5xx responses

## 2. Mode Switcher Component

- [x] 2.1 Create a `PatientLoadModeSwitcher` tab component rendering "Manual", "FHIR Data Endpoint", and "Recent" tabs
- [x] 2.2 Implement default active tab logic: "Manual" on first load; restore last active tab from sessionStorage on subsequent loads
- [x] 2.3 Disable "FHIR Data Endpoint" tab with accessible tooltip when `dataEndpoint` is absent from apply form state
- [x] 2.4 Hide or disable-with-empty-state "Recent" tab when no recent patients exist in localStorage
- [x] 2.5 ARIA handled by Ant Design Tabs (role="tablist"/"tab"/"tabpanel" and keyboard nav built in)
- [x] 2.6 Write tests covering tab switching, disabled state when `dataEndpoint` absent, and session persistence of active tab

## 3. FHIR Data Endpoint Patient Search Panel

- [x] 3.1 ~~Create `FhirPatientSearchPanel` component with a name query input and search submit trigger~~ → **Revised**: render as a single searchable `Select` dropdown with server-side search
- [x] 3.2 ~~Validate that query is non-empty before issuing request; show inline error if empty~~ → **Revised**: suppress requests when query is empty; show "Type to search patients" prompt instead
- [x] 3.3 Call `fhirClient(dataEndpoint.address, { path: '/Patient', params: { name: query } })` on search (debounced)
- [x] 3.4 ~~Render loading indicator and disable search input during in-flight request~~ → **Revised**: show loading spinner inside the dropdown while fetching
- [x] 3.5 ~~Render result list~~ → **Revised**: populate dropdown options with one entry per `Patient` resource showing full name, `birthDate`, `gender`, and `id`
- [x] 3.6 Render "No patients found" empty state when result bundle contains zero entries (inside dropdown options area)
- [x] 3.7 Render user-facing error message with CORS/network/server-down suggestion on `fhirClient` error; render HTTP status and message on 4xx/5xx
- [x] 3.8 On patient option select: build summary object `{ id, name, dob, gender, source: 'endpoint', endpointUrl, addedAt }`, set apply form `subject` to `Patient/<id>`, and pass summary to recent patients store
- [x] 3.9 Update tests to cover: typing triggers debounced search, empty query suppresses request, dropdown options render correctly, patient selection and subject population, all error states

## 4. Recent Patients localStorage Store

- [x] 4.1 Create `recentPatientsStore.ts` module with `addPatient(summary)`, `getPatients(key)`, `clearAll()` functions
- [x] 4.2 Implement scoped storage keys: `cpg-review:recent-patients:endpoint:<endpointUrl>` for endpoint-sourced; `cpg-review:recent-patients:manual` for manual
- [x] 4.3 Implement LRU eviction: on write, if entry count reaches 10, remove the entry with the oldest `addedAt` before inserting
- [x] 4.4 Implement `addedAt` update on re-selection of an existing recent patient (moves entry to top of list)
- [x] 4.5 Implement `clearAll()` removing all keys matching `cpg-review:recent-patients:*`
- [x] 4.6 Export `RECENT_PATIENTS_MAX` named constant set to `10`
- [x] 4.7 Write unit tests covering: add new entry, LRU eviction at cap, re-selection timestamp update, clearAll, and empty state

## 5. Recent Patients Tab Panel

- [x] 5.1 Create `RecentPatientsPanel` component that reads from `recentPatientsStore` and renders a unified list sorted by `addedAt` descending
- [x] 5.2 Render each entry with: full name, DOB, gender, source badge ("Data Endpoint" or "Manual")
- [x] 5.3 On entry click: set apply form `subject` and call `recentPatientsStore.addPatient` to refresh `addedAt`
- [x] 5.4 Render "Clear recent patients" action; on click call `recentPatientsStore.clearAll()` and update panel to empty state
- [x] 5.5 Write tests covering: list render and sort order, source badges, entry click sets subject, clear action empties list

## 6. Manual Mode — Recent Patients Integration

- [x] 6.1 On successful manual patient submission, extract `id`, `name`, `dob`, `gender` (where present) from the supplied data Bundle and call `recentPatientsStore.addPatient` with `source: 'manual'`
- [x] 6.2 Write test confirming manual submission writes to `cpg-review:recent-patients:manual`

## 7. Apply Form Integration

- [x] 7.1 Replace the current patient input area in the apply form with `PatientLoadModeSwitcher` and its three panels; add dedicated Data Endpoint URL field
- [x] 7.2 Pass `dataEndpointPayload` from apply form state down to `FhirPatientSearchPanel` (via `PatientLoadModeSwitcher`)
- [x] 7.3 Pass `dataEndpointPayload` as `dataEndpoint` Endpoint resource to the CPG `$apply` call in `api/apply/route.tsx`
- [x] 7.4 Manual input mode behaviour preserved — existing context data textarea and subject input rendered in "Manual" tab
- [x] 7.5 Write integration test: open apply form → switch to "FHIR Data Endpoint" tab → select patient → confirm `subject` is set correctly
