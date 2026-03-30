## Context

The current implementation of `packageBundleExtractor` uses the full FHIR reference string (e.g., "Bundle/123") for both `bundleId` and `bundleCanonical` properties. This is incorrect because:

1. In FHIR R4, a resource ID is distinct from a reference - the ID is just "123", the reference is "Bundle/123"
2. Bundles are not canonical resources in FHIR R4 and don't have canonical URLs
3. The resolver lookup uses the reference string as the key in `resourcesByReference`, but the interface suggests these should be separate concerns

The current code in `packageBundleExtractor.ts`:
```typescript
bundles.push({
  bundleId: reference,          // "Bundle/123"
  bundleCanonical: reference,   // "Bundle/123" (incorrect)
  // ...
})
```

## Goals / Non-Goals

**Goals:**
- Correctly separate the bundle resource ID from the FHIR reference
- Remove the misleading `bundleCanonical` property
- Maintain backward compatibility with resolver fallback lookups
- Update all consuming code and tests to use the corrected properties

**Non-Goals:**
- Changing the resolver's internal storage structure (`resourcesByReference`)
- Modifying how bundles are initially loaded during package decompression
- Altering the PatientSummary interface beyond what's necessary for this fix

## Decisions

### Decision 1: Use `bundleId` for resource ID only, add `bundleReference` for full reference

**Rationale:** Separate the concerns of resource identification from reference resolution.

- `bundleId`: stores `resource.id` (e.g., "123")
- `bundleReference`: stores the full FHIR reference (e.g., "Bundle/123") used for resolver lookups

**Alternative considered:** Keep `bundleId` as the full reference and add `bundleResourceId` for the ID
- **Rejected:** The name `bundleId` semantically suggests it should contain the ID, not the full reference

### Decision 2: Remove `bundleCanonical` entirely

**Rationale:** Bundles are not canonical resources in FHIR R4. They don't have `url` properties and shouldn't be referenced by canonical URLs.

**Alternative considered:** Rename to `bundleUrl` or similar
- **Rejected:** This would still be semantically incorrect - Bundles don't have canonical URLs

### Decision 3: Update PatientSummary's `id` field to use `bundleReference` instead of `bundleCanonical`

**Rationale:** The `id` field in PatientSummary is used for display purposes (shown in brackets after patient name). Using the full reference maintains current display behavior while being semantically correct.

**Alternative considered:** Use the bundle ID without "Bundle/" prefix
- **Rejected:** Would change the display format and lose context about the resource type

### Decision 4: Update resolver fallback to use `bundleReference` instead of `bundleId`

**Rationale:** The resolver's `resourcesByReference` map uses full references as keys, so the fallback lookup must use the complete reference string.

Current code:
```typescript
resolver.resourcesByReference[`${summary.bundleId}`]
```

Updated to:
```typescript
resolver.resourcesByReference[summary.bundleReference]
```

## Risks / Trade-offs

### Risk: Breaking existing stored patient summaries in localStorage
**Mitigation:** The change primarily affects package bundle extraction, not endpoint-based patients. Package bundles are re-indexed on each upload, so old summaries will be naturally replaced. For orphaned recents, the resolver fallback will handle missing `bundleReference` by failing gracefully with an error message (existing behavior).

### Risk: Test data may become stale
**Mitigation:** Update all test fixtures and mock data as part of this change to reflect the new property structure.

### Trade-off: Adding a new property increases object size
**Impact:** Each `PackageBundleExtract` now has both `bundleId` and `bundleReference` instead of `bundleId` and `bundleCanonical`.
**Justification:** The size difference is negligible (same amount of data, different property name), and semantic correctness is more important.
