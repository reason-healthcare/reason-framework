# Coding Standards

## Language and Source of Truth

- TypeScript is the source language across packages.
- Edit files in `src/` and build outputs in `lib/` are generated.
- Do not hand-edit generated JavaScript or declaration files in `lib/`.

## Formatting

- Formatting is enforced with Prettier per package.
- Run formatting from the repo root with `npm run fmt`.
- Package-level format commands are also available via each package `npm run fmt`.
- Existing package Prettier settings are semicolon-free and use single quotes.

### Whitespace Rules

**No whitespace-only lines or trailing whitespace**:
- Lines containing only spaces or tabs are not allowed
- Trailing whitespace (spaces or tabs at the end of lines) must be removed
- Empty lines should contain only a newline character

**Why this matters**:
- Prevents unnecessary diff noise in version control
- Ensures consistent code formatting across the codebase
- Reduces merge conflicts from whitespace differences

**Example**:
```typescript
// ✅ Good - no trailing whitespace, no whitespace-only lines
function example() {
  const value = 'test'
  return value
}

// ❌ Bad - trailing whitespace on line 2, whitespace-only line 3
function example() {
  const value = 'test'    
  
  return value
}
```

## Naming and Structure

- Use `PascalCase` for types, interfaces, and classes.
- Use `camelCase` for variables, functions, and method names.
- Keep filenames consistent with existing local patterns in each package (for example, kebab-style utility folders and descriptive TypeScript module names).
- Prefer explicit, descriptive identifiers over abbreviations.

## Type Safety and FHIR Handling

- Use FHIR resource typings (`fhir4.*`) where available instead of `any`.
- Follow existing guard-style patterns (`is.*`, `notEmpty`) before narrowing and accessing resource fields.
- Preserve existing endpoint parameter contracts and operation shapes when adding or changing request handling.

## Change Scope

- Keep changes focused and package-local when possible.
- Avoid unrelated refactors in shared clinical logic modules.
- Maintain existing API behavior unless the task explicitly requires a behavior change.

## Validation Before Handoff

- **Always run `npx tsc --noEmit` in the affected package before marking a task complete.** TypeScript errors must be resolved — do not leave type errors introduced by your changes.
- Run the narrowest relevant command first (package tests/lint/build), then broader checks as needed.
- For cross-package changes, run `npm run build` at the repository root.