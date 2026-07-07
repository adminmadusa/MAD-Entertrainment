# ADR-015: Public API Freeze During Infrastructure Changes

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

Phase 2A restructures `packages/ui` from a flat component directory into a grouped hierarchy (`primitives/`, `composites/`, `layouts/`). The existing flat files in `src/components/` are used by both applications. There is a risk that moving files silently changes component behavior if any code runs during the move — for example, if a file is rewritten rather than simply relocated, or if an import shim introduces a wrapper.

---

## Context

We must guarantee 100% component stability and compatibility for client applications while re-architecting the shared layout files underneath.

---

## Decision

During Phase 2A (infrastructure PR), **no existing component behavior changes**. The rule is:

> An import shim may only re-export. It may not wrap, transform, or add logic.

Concretely, every file in `src/components/` that is converted to a shim must contain exactly:

```ts
export * from '../primitives/ComponentName';
// or
export * from '../composites/ComponentName';
```

No default export changes. No prop type widening or narrowing. No additional logic. This ensures `import { Button } from '@mad/ui'` returns **exactly the same component** before and after Phase 2A, with no behavioral difference.

---

## Alternatives Considered

**Option A: Migrate all consumers in the same PR**
Rejected. Touching both `packages/ui` and application code in the same PR creates a large diff that is difficult to review and increases regression risk.

**Option B: Delete old files immediately**
Rejected. Immediate deletion breaks any application import that references the old canonical path before the consumer has been updated. Shims allow a clean, incremental migration through Phase 2.5.

---

## Consequences

**Positive:**
- Phase 2A carries near-zero regression risk.
- The shim-to-implementation migration can be verified by a mechanical test: import the old path and the new path; assert they are reference-equal.
- CI remains green throughout the restructuring.

**Negative:**
- The old flat `src/components/` shim files remain until Phase 2.5, adding a layer of indirection.
- Developers must know not to edit shim files — they are routing only.

---

## Technical & Operational Impact

### Migration Strategy
Create re-export shims for all moved components, allowing client imports to resolve correctly without client code modification.

### Operational Impact
Allows component library developers to clean up package internal structures without blocking client product feature teams.

### Security Impact
None. This is a purely structure-level export definition change.

### Performance Impact
Maintains existing bundle compiler optimization settings with no size change.

### Testing Strategy
Unit tests in the component library and the applications will be executed to verify no regression occurred.

### Rollback Strategy
If export compilation fails, the structural changes can be rolled back by reverting the branch checkout.

---

## Future Considerations

Once consuming applications are fully updated to the new public entry points, all backward-compatible shim files will be permanently deleted from the codebase.

---

## References

- [REPOSITORY_GOVERNANCE.md](../../REPOSITORY_GOVERNANCE.md)
