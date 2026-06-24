# CPG Review Compile Time Analysis

## Current Behavior

The Next.js dev server still has a noticeable cold compile when the main app route is first opened. On a clean `.next` cache, the `/` route currently takes about **14-15 seconds** to compile before the first page response.

Once the route has compiled, keeping the dev server running makes subsequent page responses fast because the compiled module graph is cached.

## Root Cause

The slow first compile is caused by several heavy client-side dependencies being reachable from the main page:

| Dependency                    | Approximate Size | Purpose                           |
| ----------------------------- | ---------------- | --------------------------------- |
| `reactflow`                   | ~400KB           | Flow diagram visualization        |
| `elkjs`                       | ~500KB           | Graph layout engine (WebAssembly) |
| `antd`                        | ~1MB+            | UI component library              |
| `@aehrc/smart-forms-renderer` | ~300KB+          | FHIR questionnaire rendering      |

These libraries are tied to the review experience, so the dev bundler must process a large module graph before the first review-capable page is ready.

## Optimization Attempts

### 1. Dynamic Imports

Dynamic imports (`next/dynamic`) reduce production bundle size and can delay some browser work, but they did not materially remove the first-route dev compile cost because the main app still reaches the heavy review UI graph.

### 2. Route Splitting

Splitting the app into separate `/upload` and `/review` routes was tested and then reverted.

The split moved the long compile/load cost from app startup to the transition into the review page. That felt worse for the primary user flow: after uploading content, clicking through to review appeared slow or unresponsive right when the user expected to see results.

The current UX tradeoff is intentional: keep the longer wait near startup so the upload-to-review interaction can stay immediate once the app is ready.

Route splitting also introduced state-management complexity. Uploaded package data and form inputs currently live in memory during the session, with persistence as a convenience rather than a hard requirement. Splitting routes forced that state through local storage or another cross-route store, which caused regressions when local storage was unavailable and when navigating back to the upload form.

## Recommendations

### Short-term

- Keep the dev server running while working; the expensive route compile is mostly a cold-cache cost.
- Use `npm run build && npm run start` when validating production behavior instead of judging production performance from dev mode.
- Avoid moving the review cost behind a post-upload navigation unless the review page can show clear loading state and preserve in-memory package/form state without relying on local storage.

### Medium-term

1. **Replace Ant Design with lighter alternatives** - Use project-specific components, Tailwind, or a smaller headless component layer for the review UI.
2. **Reduce main-page imports** - Keep expensive review-only components out of the upload-first surface where possible, without reintroducing a slow post-upload transition.
3. **Audit FHIR renderer usage** - Confirm whether `@aehrc/smart-forms-renderer` needs to be loaded for all review sessions or only when Questionnaire resources are present.
4. **Keep ELK.js lazy** - ELK.js is already dynamically imported in `Graph.tsx`; preserve that boundary when changing graph rendering.

### Long-term

1. **Review state architecture** - Introduce a durable in-memory session store that can survive route changes without requiring local storage.
2. **Revisit route splitting only after state is solved** - If upload and review become separate routes, the review route needs an explicit loading state and reliable memory-backed package handoff.
3. **Remove `react-router-dom` from the Next app** - Prefer the Next.js App Router instead of an in-page `MemoryRouter`.
4. **Continue reducing heavy dependencies** - The best remaining compile-time win is shrinking the dependency graph, especially UI and visualization libraries.

## Current Optimizations in Place

- `FlowDisplay` is dynamically imported in `ContentSection.tsx`
- `UploadSection` is dynamically imported in `page.tsx`
- ELK.js is dynamically imported in `Graph.tsx`
- TypeScript target is `es2020` to reduce unnecessary transpilation

## Measured Times

| Action             | Time       |
| ------------------ | ---------- |
| Dev server startup | ~1.5-1.7s  |
| First page compile | ~14-15s    |
| Warm page response | ~140-150ms |
| Production build   | ~30s       |
