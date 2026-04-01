# CPG Review Compile Time Analysis

## Current Behavior

The Next.js dev server takes **~10-15 seconds** to compile the `/` route on first visit, processing approximately **11,000+ modules**.

## Root Cause

The slow compile time is caused by **heavy dependencies** that are bundled together:

| Dependency                    | Approximate Size | Purpose                           |
| ----------------------------- | ---------------- | --------------------------------- |
| `reactflow`                   | ~400KB           | Flow diagram visualization        |
| `elkjs`                       | ~500KB           | Graph layout engine (WebAssembly) |
| `antd`                        | ~1MB+            | UI component library              |
| `@aehrc/smart-forms-renderer` | ~300KB+          | FHIR questionnaire rendering      |

These libraries are all imported in the main page component, requiring webpack to process everything on initial load.

## Why Optimization Attempts Failed

### 1. Dynamic Imports

Dynamic imports (`next/dynamic`) reduce **bundle size** for end users but don't help **dev compile time** - webpack still needs to process all modules.

### 2. Turbopack (Next.js 15)

Turbopack was tested but:

- Required Node.js 18.18+ (project uses 18.17)
- Doesn't support CSS nesting syntax used in `globals.css`
- Stricter about path resolution (`baseUrl` imports)
- Actually compiled **slower** (~29s) in testing

### 3. Route Splitting

Splitting into `/upload` and `/review` routes would help but requires significant refactoring of state management (currently uses React state, would need localStorage coordination).

## Recommendations

### Short-term (Live with it)

- Use `npm run build && npm run start` for testing instead of dev mode
- Keep the dev server running - subsequent compiles are cached and faster

### Medium-term (Code changes)

1. **Replace Ant Design with lighter alternatives** - Use Tailwind + headless UI
2. **Lazy load ELK.js** - Already done via dynamic import in `Graph.tsx`
3. **Tree-shake Ant Design** - Import only specific components

### Long-term (Architecture)

1. **Route splitting** - Separate `/upload` and `/review` pages
2. **Remove react-router-dom** - Use Next.js App Router instead of MemoryRouter
3. **Consider Remix or Vite** - Different bundling strategies may perform better

## Current Optimizations in Place

- `FlowDisplay` is dynamically imported in `ContentSection.tsx`
- `UploadSection` is dynamically imported in `page.tsx`
- ELK.js is dynamically imported in `Graph.tsx`
- TypeScript target is `es2020` (reduces transpilation)

## Measured Times

| Action              | Time           |
| ------------------- | -------------- |
| Dev server startup  | ~3.5s          |
| First page compile  | ~10-15s        |
| Subsequent compiles | ~1-2s (cached) |
| Production build    | ~30s           |
