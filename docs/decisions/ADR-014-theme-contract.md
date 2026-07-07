# ADR-014: Theme Contract

## Metadata
- **Status**: Accepted
- **Date**: 2026-07-06
- **Owner**: Architecture Review Board
- **Authors**: Architecture Review Board
- **Reviewers**: Repository Governance Owner
- **Decision Category**: Architecture / UI
- **Related Documents**: [REPOSITORY_GOVERNANCE.md](../../REPOSITORY_GOVERNANCE.md), [THEME_CONTRACT.md](../design-system/standards/THEME_CONTRACT.md)
- **Related GitHub Issues**: None
- **Related Pull Requests**: None

---

## Problem Statement

As the design system grows to support multiple products (MAD Entertrainment, Farmer Marketplace, CRM, etc.), each product needs its own visual theme. Without a formal contract, different themes will define different subsets of tokens, causing components to render incorrectly or fall back to browser defaults in some themes.

---

## Context

We need to establish a standard token agreement that all present and future visual themes must comply with to prevent UI failures or visual regression.

---

## Decision

A **Theme Contract** is established that defines the complete required set of CSS custom properties every theme must implement. See [THEME_CONTRACT.md](../design-system/standards/THEME_CONTRACT.md) for the full token specification.

Themes that satisfy the contract are guaranteed to work with all `@mad/ui` components. Themes that are missing tokens will surface as visual defects (missing colors, incorrect sizing).

In Phase 4, the contract will be enforced by an automated validator that runs as part of `pnpm governance:ui-baseline`.

---

## Alternatives Considered

**Option A: No formal contract — themes define whatever they want**
Rejected. Components would need per-token fallback values throughout all CSS, making maintenance very expensive and inconsistent.

**Option B: Inherit from a base theme file**
Considered. CSS inheritance/cascade means child themes would need `@import` of the base first. This is possible, but makes it harder to audit what each theme defines. A contract with explicit token ownership is cleaner.

---

## Consequences

**Positive:**
- Any new product theme is plug-and-play with the component library.
- Missing tokens are detectable early — in development, not in production.
- The `default` theme provides a complete neutral reference implementation.
- Future theme authors have a clear starting point.

**Negative:**
- Adding a new required token to the contract is a breaking change for all existing themes.
- Themes must be kept in sync with contract updates.

---

## Technical & Operational Impact

### Migration Strategy
Convert the existing brand theme to satisfy the new CSS variable naming structure defined by the contract.

### Operational Impact
Theme authors have a structured reference template, reducing visual drift during new product design rollouts.

### Security Impact
None. Theme structures are strictly aesthetic and do not interact with security systems.

### Performance Impact
Ensures fast styling resolution by leveraging browser-native CSS variables rather than JavaScript evaluation.

### Testing Strategy
Verified by the baseline UI validator checks to ensure required variables exist in theme files.

### Rollback Strategy
Any styling contract issues can be mitigated by reverting to the default backup styles.

---

## Future Considerations

Automated CI gates will fail builds if any visual theme file deviates from the required tokens defined in the schema.

---

## References

- [THEME_CONTRACT.md](../design-system/standards/THEME_CONTRACT.md)
