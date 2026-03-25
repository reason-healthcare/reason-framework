## Context

The first delivery of the patient context panel used antd's default Tabs component with its underline/ink-bar style. The target design (reference image) shows a segmented button-group style: three bordered pill buttons side-by-side with the active one rendered with a distinct background fill and no underline. The recent patients list was also delivered without a scroll boundary, meaning the panel height grows indefinitely as history accumulates — this is unacceptable at 10 entries maximum, but still produces an awkward layout jump.

Both issues are presentational; no APIs, state shapes, or data models change.

## Goals / Non-Goals

**Goals:**
- Match the tab visual style to the reference design (segmented button-group)
- Cap the recent patients list at a fixed height with internal scroll

**Non-Goals:**
- Changing tab keyboard/accessibility behaviour (already handled by antd)
- Any change to patient store logic, API routes, or data shapes
- Responsive or mobile layout work

## Decisions

### Tab visual style: antd Tabs type="card" vs custom CSS vs antd Segmented

Three options:
1. **antd `Tabs type="card"`** — gives bordered tabs but with extra padding and a bottom border that creates a "folder tab" appearance, not the pill look in the reference design.
2. **Custom CSS on `Tabs type="line"`** — override ink-bar, active/hover colors. Already done partially in `applyForm.css` for teal colors. Can be extended but fighting the component's DOM structure is brittle.
3. **antd `Segmented` component** — designed exactly for this pattern: mutually exclusive options rendered as a bordered button group. Active item gets a solid fill. No underline. Matches the reference design directly.

**Decision: use `antd Segmented`** and replace `Tabs` in `PatientLoadModeSwitcher`. The Segmented component is the right semantic and visual primitive for this UX. Tab panels (content rendering) will be driven by local state keyed to the selected segment value rather than Tabs' built-in panel mechanism.

### Scroll container: CSS `overflow-y: auto` with fixed max-height

Apply `max-height` + `overflow-y: auto` to the list wrapper inside `RecentPatientsPanel`. The height should be large enough to show ~3 entries comfortably without needing to scroll, prompting discovery of the scroll behaviour at ~4+. A `max-height` of `320px` accommodates ~3 cards at ~100px each.

## Risks / Trade-offs

- **Segmented disabled state**: antd Segmented supports a `disabled` prop on individual options. This should cover the existing requirement to disable the "FHIR Data Endpoint" option when no endpoint is configured. Needs verification that the tooltip wrapper still works when the option is disabled.
- **Session storage key**: currently keyed to Tabs' `activeKey` string values. Segmented uses the same string values, so no migration is needed.
- **Scroll bar appearance**: native scrollbar may look different across OS/browsers. Acceptable for v1 — custom scrollbar styling deferred.
