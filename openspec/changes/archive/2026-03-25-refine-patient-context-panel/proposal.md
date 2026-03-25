## Why

The shipped patient context panel uses antd's default tab underline style which feels visually heavy and mismatched against the rest of the apply form. The recent patients list also has no scroll boundary, causing the panel to grow unboundedly as history accumulates. These are the two most visible UX gaps from the initial delivery.

## What Changes

- Replace the antd Tabs underline style on the patient context mode switcher with a segmented button-group style (bordered pill tabs, active tab elevated with background fill) to match the target design
- Apply a fixed-height scrollable container to the recent patients list so the panel height is predictable regardless of history size

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `patient-load-mode-switcher`: Tab visual style changes from antd underline to segmented button-group style
- `recent-patients-tab`: Recent patients list gains a fixed-height scrollable container

## Impact

- `PatientLoadModeSwitcher.tsx` — tab style change (antd Tabs type or CSS override)
- `RecentPatientsPanel.tsx` — add scroll container with fixed height
- `applyForm.css` — CSS adjustments for new tab style and scroll region
- Tests for PatientLoadModeSwitcher and RecentPatientsPanel may need visual assertion updates
