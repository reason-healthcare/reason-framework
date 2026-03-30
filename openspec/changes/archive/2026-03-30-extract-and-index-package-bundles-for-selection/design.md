## Context

The apply form already supported endpoint-based patient search, recent-patient recall, and selected-patient preview, but local package patient selection still relied on manual JSON entry rather than browsing the uploaded package contents. The uploaded package resolver already held `Bundle` resources in memory, so the missing capability was a reliable extraction/indexing flow and a UI path for selecting those bundles directly.

During implementation, a key distinction emerged between:
- the **package catalog**: every patient-containing bundle available from the current uploaded package, and
- **recent package selections**: only package bundles the user explicitly chose.

Keeping those two concerns separate prevents the Recent tab from being flooded by every bundle in an upload while still letting the bundle-selection mode show all available package bundles.

## Goals / Non-Goals

**Goals:**
- Replace manual bundle JSON entry with a searchable bundle-selection surface.
- Extract patient-containing bundles from the uploaded resolver and retain enough metadata to present them as patient choices.
- Reuse one selection component for both package catalog browsing and recent history.
- Ensure package selection updates both `dataPayload` and `subject` consistently.
- Keep recent-history semantics correct: uploaded bundle inventory is not the same as recently selected patients.
- Preserve keyboard and click accessibility for patient selection rows.

**Non-Goals:**
- Changing FHIR endpoint patient-search behavior.
- Introducing server-side persistence for uploaded bundles or recents.
- Fetching additional package data after upload; all bundle browsing is driven from the uploaded resolver/local storage.

## Decisions

### 1. Bundle resources are extracted from `resourcesByReference`
**Decision:** Bundle extraction iterates `BrowserResolver.resourcesByReference`, not `resourcesByCanonical`.
**Rationale:** Package `Bundle` resources do not carry canonical `url` values, so they are addressable by `ResourceType/id` reference keys but not by canonical URL.
**Alternative considered:** Reconstruct bundle identity from canonical storage. Rejected because bundle resources are not reliably present there.

### 2. Separate package catalog from recent history
**Decision:** Store uploaded package bundle inventory in `cpg-review:package-catalog`, while user-selected package bundles continue to use `cpg-review:recent-patients:package`.
**Rationale:** The bundle tab needs the full uploaded inventory, but the Recent tab should represent explicit user choices only.
**Alternative considered:** Writing every extracted bundle directly into the recents key on upload. Rejected because it caused the Recent tab to show all package bundles before any user selection.

### 3. Reuse one selection panel for both bundle catalog and recents
**Decision:** Use a single `PatientSelectionPanel` with mode-like props (`sourceFilter`, `searchPlaceholder`, `hideClearButton`, `emptyMessage`) to render either the package catalog or recent-patient history.
**Rationale:** The list interaction, search, accessibility, and selection flow are the same across both surfaces; only the data source and some copy differ.
**Alternative considered:** Separate bundle-list and recent-list components. Rejected to avoid duplicated list rendering, keyboard behavior, and package selection logic.

### 4. Package selection hydrates apply context from stored bundle JSON
**Decision:** Selecting a package bundle sets `dataPayload` to the stored `bundleJson` and sets `subject` to `Patient/<patientId>` using the patient extracted from that bundle.
**Rationale:** The selected bundle already represents the desired local patient context, so the apply form should use that exact payload with no additional lookup required.
**Alternative considered:** Reconstruct context later from bundle identifiers only. Rejected because it would make selection dependent on resolver state and complicate reload behavior.

### 5. Resolver fallback remains available for missing bundle payloads
**Decision:** If a stored package summary lacks `bundleJson`, selection falls back to `resolver.resourcesByReference[bundleId]`.
**Rationale:** This preserves resilience for cases where the summary payload is unavailable but the uploaded resolver is still present.
**Alternative considered:** Fail immediately when `bundleJson` is absent. Rejected because the resolver already contains enough information to recover the bundle in active sessions.

### 6. Entire patient rows are selection controls
**Decision:** The whole rendered patient row is clickable and keyboard activatable, while the visible `Select` button remains as a secondary affordance.
**Rationale:** Package and recent lists are selection surfaces; making the full row interactive reduces precision requirements and improves discoverability.
**Alternative considered:** Button-only selection. Rejected because it made the list feel partially actionable and slowed repeated selections.

## Risks / Trade-offs

- **Large bundle payloads in localStorage** → Package summaries store full `bundleJson`, which increases localStorage usage. Mitigation: the package catalog is overwritten per upload and recent history remains capped at 10 per key.
- **Stale package catalog after upload replacement** → Uploading a new package clears storage and replaces the package catalog. This is intentional because the bundle tab should always reflect the currently uploaded content.
- **Resolver-dependent fallback** → Missing `bundleJson` can only be recovered while the resolver is still available in the browser session. Mitigation: persist `bundleJson` directly in the package summary whenever possible.

## Migration Plan

- Extract package bundles during upload and write them to the package catalog.
- Replace manual bundle-entry UI with the bundle selection mode in the switcher.
- Reuse the patient selection panel for both bundle browsing and recents.
- Write selected package bundles into recent history at selection time.
- Validate with unit and integration tests covering upload, selection, preview, and persistence behavior.

## Open Questions

- Should the package catalog be capped independently if exceptionally large IG packages are uploaded?
- Should future package-bundle cards display additional metadata (e.g., bundle type or package source) beyond resource counts and types?
