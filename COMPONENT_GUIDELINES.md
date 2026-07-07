# Component Guidelines

| Field | Value |
|-------|-------|
| **Standard** | UI-CG-001 |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Owner** | MAD Engineering Governance |
| **Approver** | Engineering Lead |
| **Effective Date** | 2026-07-07 |
| **Last Updated** | 2026-07-07 |
| **Supersedes** | N/A |
| **Review Frequency** | Quarterly |
| **Subordinate To** | [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md) |
| **Related Standards** | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [RESPONSIVE_GUIDELINES.md](RESPONSIVE_GUIDELINES.md), [ACCESSIBILITY_GUIDELINES.md](ACCESSIBILITY_GUIDELINES.md) |

---

## Authority

This document is subordinate to [UI_UX_GOVERNANCE.md](UI_UX_GOVERNANCE.md).

If any rule here conflicts with `UI_UX_GOVERNANCE.md`, that document takes precedence.

---

## Purpose

Define how UI components are created, owned, composed, extended, deprecated, and deleted in the MAD Entertrainment monorepo. Component governance prevents duplication, inconsistency, and accumulating dead UI.

---

## 1. Component Tiers

Every UI component belongs to exactly one tier.

| Tier | Location | Description | Who Creates |
|------|----------|-------------|-------------|
| **Foundation** | `packages/ui/src/primitives/` | Unstyled or minimally styled Radix UI / shadcn primitives | UI Platform team |
| **Shared** | `packages/ui/src/components/` | MAD-branded, fully styled shared components | UI Platform team |
| **Feature** | `apps/*/src/components/feature/` | Composed from Shared components for a specific domain | Feature teams |
| **Page** | `apps/*/src/components/page/` | Single-use layouts composed from Feature components | Feature teams |

### Rules

- Feature and Page components may NOT be used by `packages/ui`.
- Shared components may NOT import from any `apps/*` package.
- Foundation components must remain unstyled enough to accommodate MAD brand theming.
- A Shared component must have at least two consumers before it is promoted from Feature tier.

---

## 2. Component-First Rule (Mandatory)

Before creating any new component, the following search is mandatory.

```
Search packages/ui
  ↓
Component exists?
  ├── Yes → Reuse it. Stop.
  ├── Partially → Extend it with a variant prop. Stop.
  └── No → Justify creating a new component in the PR description.
```

Creating a duplicate component without a documented justification is a governance violation and blocks PR merge.

### Search Procedure

1. Run: `find packages/ui/src -name "*.tsx" | xargs grep -l "<ComponentName>"`
2. Check the `packages/ui` exports in `packages/ui/src/index.ts`.
3. Check shadcn components in `packages/ui/src/components/ui/`.
4. Check Radix UI primitives already installed.

---

## 3. Component Ownership

Every component must declare an owner in its file header comment.

```tsx
/**
 * @component Button
 * @tier Shared
 * @owner UI Platform
 * @consumers apps/web, apps/admin
 * @since 1.0.0
 */
```

Owner is responsible for:
- Reviewing PRs that modify the component.
- Maintaining the component's API contract.
- Executing deprecation when the component is retired.

---

## 4. Component API Standards

### Props Contract

- All props must be typed with TypeScript interfaces, not inline types.
- Required props must be clearly distinguished from optional props.
- Boolean props must default to `false`.
- Event handler props must follow the `onAction` naming convention.
- No prop may be named with a generic identifier (`data`, `info`, `item`).

### Variant System

Shared components must use a variant system rather than accepting raw style props.

```tsx
// Correct
<Button variant="primary" size="md" />

// Incorrect
<Button color="#ff4444" padding="12px" />
```

Allowed variants must be enumerated and documented in the component's prop types.

---

## 5. File Size Limits

These limits apply to component files. Files exceeding the limit require Engineering Lead review before merge.

| Component Tier | Preferred | Review Required | Refactor Required | PR Blocked |
|----------------|-----------|----------------|-------------------|-----------|
| Foundation | 0–150 lines | 151–250 | 251–400 | 401+ |
| Shared | 0–300 lines | 301–500 | 501–700 | 701+ |
| Feature | 0–300 lines | 301–500 | 501–700 | 701+ |
| Page | 0–200 lines | 201–350 | 351–500 | 501+ |

---

## 6. Component Composition Rules

- Prefer composition over inheritance.
- Use `children` and `asChild` patterns (Radix UI convention) over render props.
- Do not create components that render other feature-level components internally unless building a Feature or Page component.
- Shared components must not contain business logic.
- Shared components must not make API calls.
- Shared components must not access global application state directly.

---

## 7. Deprecation Process

A component may not be deleted without following this process.

### Deprecation Steps

1. Add `@deprecated` JSDoc tag with a migration path:
   ```tsx
   /**
    * @deprecated Use <NewComponent /> instead. Remove by: 2026-10-01.
    * Migration: Replace <OldButton /> with <Button variant="primary" />.
    */
   ```
2. Add a console warning in development mode.
3. Notify all consumers in the deprecation PR description.
4. Set a removal date (minimum 30 days from deprecation).
5. Open a follow-up issue for removal.
6. Remove the component on or after the removal date.

Components marked `@deprecated` may not be used in new code.

---

## 8. New Component Creation Checklist

Before merging a new Shared component:

```
[ ] Justification documented (why no existing component satisfies this need)
[ ] Owner declared in file header comment
[ ] Props typed with TypeScript interface
[ ] Variant system implemented (not raw style props)
[ ] Accessible: ARIA attributes, keyboard navigation, focus state
[ ] Responsive: works at 320px and above
[ ] All states implemented: default, hover, focus, active, disabled, loading
[ ] Unit tests written
[ ] Added to packages/ui/src/index.ts exports
[ ] Storybook story created (if applicable)
[ ] File size within allowed limit
```

---

## 9. Component Audit Schedule

Every quarter:

- Identify components with zero consumers (dead components) → remove.
- Identify near-duplicate components → consolidate.
- Identify components exceeding file size limits → refactor.
- Review deprecated components past their removal date → delete.

> **TODO**: Automate zero-consumer detection in the governance audit script.

---

## Change Log

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-07-07 | MAD Engineering Governance | Initial component guidelines |
