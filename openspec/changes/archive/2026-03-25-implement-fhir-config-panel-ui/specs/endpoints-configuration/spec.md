## ADDED Requirements

### Requirement: Endpoints configuration section renders inline and collapsed by default
The apply form SHALL render an `Endpoints Configuration` collapsible section as the first item in the step-0 form. The section SHALL be collapsed by default on every page load.

#### Scenario: Section is collapsed on initial render
- **WHEN** the apply form mounts for the first time
- **THEN** the `Endpoints Configuration` section is collapsed and the URL inputs are not visible

#### Scenario: Section expands on user interaction
- **WHEN** the user clicks the `Endpoints Configuration` section header
- **THEN** the section expands to reveal all four URL input fields

#### Scenario: Section collapses on second click
- **WHEN** the section is expanded and the user clicks the header again
- **THEN** the section collapses and the URL inputs are hidden

---

### Requirement: Collapsed state renders a read-only URL summary
When the `Endpoints Configuration` section is collapsed, it SHALL display a compact read-only summary of the currently configured endpoint URL values inline below or beside the section header.

#### Scenario: Collapsed summary shows active URL values
- **WHEN** the section is collapsed and all four endpoint values are set
- **THEN** the header area displays a summary string containing at least the Data endpoint URL

#### Scenario: Collapsed summary reflects updated values after edit
- **WHEN** the user expands the section, changes a URL value, then collapses the section
- **THEN** the collapsed summary reflects the newly entered URL

---

### Requirement: Endpoint URL values persist to localStorage
All four endpoint URL values (CPG Engine, Content, Terminology, Data) SHALL be persisted to `localStorage` under the key `endpointsConfig` as a JSON object. Values SHALL be restored from `localStorage` on component mount.

#### Scenario: Values survive page reload
- **WHEN** the user sets endpoint URLs and reloads the page
- **THEN** the `EndpointsConfiguration` component renders with the previously saved URL values

#### Scenario: Default values used when no localStorage entry exists
- **WHEN** the component mounts and no `endpointsConfig` key exists in localStorage
- **THEN** each input renders with its hardcoded default value (e.g., `http://localhost:8080/fhir`)

#### Scenario: localStorage is updated on URL change
- **WHEN** the user types a new value into any endpoint input
- **THEN** `localStorage.getItem('endpointsConfig')` reflects the updated value

---

### Requirement: Endpoint values are published to ApplyForm via callbacks
The `EndpointsConfiguration` component SHALL accept `onChange` callback props for each of the four endpoint values and call them whenever the corresponding input changes, so `ApplyForm` always holds the current resolved values for use at submit time.

#### Scenario: Parent receives updated value on input change
- **WHEN** the user changes the Data endpoint URL
- **THEN** the `onDataEndpointChange` callback is called with the new value

---

### Requirement: Reset clears endpoint localStorage and resets inputs
When `ApplyForm.resetForm` is called, it SHALL clear the `endpointsConfig` key from `localStorage` and reset the `EndpointsConfiguration` inputs to their default values.

#### Scenario: Reset removes persisted endpoint config
- **WHEN** the user clicks Reset on the apply form
- **THEN** `localStorage.getItem('endpointsConfig')` returns `null`

#### Scenario: Reset restores default URL values in inputs
- **WHEN** the user clicks Reset after having changed endpoint values
- **THEN** each endpoint input displays its default value
