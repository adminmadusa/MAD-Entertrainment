# ADR-013: UI Package Public API Boundary

## Metadata
- **Status**: Accepted
- **Date**: 2026-07-06
- **Owner**: Architecture Review Board
- **Authors**: Architecture Review Board
- **Reviewers**: Repository Governance Owner
- **Decision Category**: Architecture / UI
- **Related Documents**: [REPOSITORY_GOVERNANCE.md](../../REPOSITORY_GOVERNANCE.md), [AGENTS.MD](../../AGENTS.MD)
- **Related GitHub Issues**: None
- **Related Pull Requests**: None

---

## Problem Statement

The `@mad/ui` package began as a flat collection of component files with no defined public API surface. Consumers imported directly from internal paths such as `src/components/Button.tsx`. As the library grows and will be shared across multiple Esparex products, this creates coupling between consumers and internal implementation details. If the internal folder structure changes, every consumer import breaks — regardless of whether the component API changed.

---

## Context

We need to decouple component consumer apps from the internal physical folder structures of the shared library, ensuring that folder refactoring does not cause compile-time regressions for consuming applications.

---

## Decision

The `package.json` `"exports"` field is the **sole authoritative definition** of `@mad/ui`'s public API.

```json
{
  "exports": {
    ".":                 "./src/index.tsx",
    "./icons":           "./src/icons/index.ts",
    "./styles/*":        "./src/styles/*",
    "./themes/mad":      "./src/themes/mad/index.css",
    "./themes/default":  "./src/themes/default/index.css",
    "./tailwind/preset": "./src/tailwind/preset.ts",
    "./testing":         "./src/internal/testing/index.ts"
  }
}
```

Everything not listed in `"exports"` is considered internal and may change at any time without notice.

---

## Alternatives Considered

**Option A: Barrel-only (`src/index.tsx` is the only entry point)**
Rejected because CSS files and TypeScript config files cannot be re-exported through a JS barrel. Separate entry points for styles and the Tailwind preset are necessary.

**Option B: Expose `src/` directly (no exports map)**
Rejected because it couples all consumers to the internal directory layout. Any reorganization becomes a breaking change.

---

## Consequences

**Positive:**
- Internal folders can be reorganized, split, or renamed without breaking consumers.
- The public API surface is explicit, discoverable, and auditable.
- New entry points are added deliberately through a PR, making API additions a reviewed decision.

**Negative:**
- Consumers cannot import from internal paths — some workarounds in application code must be updated.
- TypeScript path resolution requires the exports map to be maintained accurately.

---

## Technical & Operational Impact

### Migration Strategy
Existing consumer applications will be migrated in Phase 2.5 to import exclusively from the designated public entry points.

### Operational Impact
Improves developer productivity and limits workspace build instability when shared packages are modified.

### Security Impact
Ensures internal helper methods and testing configurations are not exposed or imported by production codebases.

### Performance Impact
Enables tree-shaking and optimized compilation via Turborepo task orchestration.

### Testing Strategy
Verified by static compilation checks (`pnpm type-check`) in both `apps/web` and `apps/admin`.

### Rollback Strategy
Any export regressions can be rolled back by restoring temporary exports or shims in `package.json`.

---

## Future Considerations

We plan to enforce this boundary via automated lint rules that prevent direct imports of files outside the exports list in future phases.

---

## References

- [REPOSITORY_GOVERNANCE.md](../../REPOSITORY_GOVERNANCE.md)
