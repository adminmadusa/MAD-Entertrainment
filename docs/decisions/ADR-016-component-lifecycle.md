# ADR-016: Component Lifecycle Model

## Metadata
- **Status**: Accepted
- **Date**: 2026-07-06
- **Owner**: Architecture Review Board
- **Authors**: Architecture Review Board
- **Reviewers**: Repository Governance Owner
- **Decision Category**: Architecture / UI
- **Related Documents**: [REPOSITORY_GOVERNANCE.md](../../REPOSITORY_GOVERNANCE.md), [API_STABILITY.md](../design-system/standards/API_STABILITY.md)
- **Related GitHub Issues**: None
- **Related Pull Requests**: None

---

## Problem Statement

As the component library grows, there needs to be a shared understanding of what stability guarantees consumers can rely on at each stage of a component's life. Without a formal model, teams may depend on unstable APIs or not realize when breaking changes are permitted.

---

## Context

We need to establish clear stability stages for components to avoid unexpected regressions when application teams use component packages.

---

## Decision

Every `@mad/ui` component carries a lifecycle state, tracked in the component manifest and in `Component.md`:

```
Experimental → Preview → Stable → Deprecated → Removed
```

The full breaking-change policy per state is defined in [API_STABILITY.md](../design-system/standards/API_STABILITY.md).

**Key rules:**
- Phase 2B components ship as **Preview**
- Promotion to **Stable** requires Phase 2.5 adoption complete and no breaking API changes in the prior release cycle
- **Stable** components never have breaking changes — only a major version (`v2.0.0`) may introduce them
- **Deprecated** components have a minimum one-version grace period before removal

---

## Alternatives Considered

**Option A: No lifecycle model — all components are treated as stable**
Rejected. Early-stage components need the freedom to iterate. A single "stable" status would either prevent necessary evolution or lead to silent breaking changes.

**Option B: semver per component**
Considered. Per-component semver is how some large design systems (e.g. Carbon) operate. Rejected for now because it adds tooling complexity that isn't justified at the current scale. Package-level semver combined with the lifecycle state model provides sufficient granularity.

---

## Consequences

**Positive:**
- Teams know exactly what stability to expect when importing a component.
- Governance tooling can enforce lifecycle rules automatically (Phase 4).
- The component manifest becomes a source of truth for release tooling.

**Negative:**
- Promotion decisions require deliberate review, adding a small process overhead.
- Components can stay in `preview` longer than ideal if adoption is slow.

---

## Technical & Operational Impact

### Migration Strategy
Track all component lifecycle states inside `component-manifest.json` and enforce stability policies during pull request reviews.

### Operational Impact
Improves library consumption predictability, ensuring developers are aware of API stability before integration.

### Security Impact
Allows quick deprecation and replacement of visual elements that present security or access control risks.

### Performance Impact
None. This is metadata-level governance checking.

### Testing Strategy
Verified by the manifest and documentation validator scripts which run at pull request gate.

### Rollback Strategy
Any premature state transitions can be rolled back by updating the component manifest.

---

## Future Considerations

Future releases will integrate automatic compiler warnings if consumer applications import a component marked as `Deprecated`.

---

## References

- [API_STABILITY.md](../design-system/standards/API_STABILITY.md)
