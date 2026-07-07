---
name: "ui-ux"
description: "Enforce the MAD UI/UX Governance Standard (UI-001) for all front-end implementations. Audit mobile responsiveness, WCAG accessibility, navigation clarity, component reuse, loading/empty/error states, and design consistency. Produce evidence-backed audit reports before any UI implementation begins."
version: "2.0"
owner: "UI/UX Designer"
last_updated: "2026-07-07"
depends_on: "None"
supersedes: "1.0"
scope: "UI-UX"
priority: "Supporting"
governance_standard: "UI-001"
governance_document: "UI_UX_GOVERNANCE.md"
---

# UI & UX Auditing Skill — v2.0

## Governing Standard

This skill is **operationally subordinate** to `UI_UX_GOVERNANCE.md`.

Rules:

- Never override `UI_UX_GOVERNANCE.md`.
- If a conflict exists between this skill and `UI_UX_GOVERNANCE.md`, follow `UI_UX_GOVERNANCE.md`.
- Any new UI standard must be added to `UI_UX_GOVERNANCE.md` first, then reflected here.
- Read `UI_UX_GOVERNANCE.md` at the start of every UI audit.

---

## Purpose

Operationalize the MAD UI/UX Governance Standard (UI-001) by guiding systematic auditing of front-end layouts for visual consistency, mobile responsiveness, navigation clarity, component reuse, accessibility, loading/empty/error states, and design token compliance.

---

## Trigger Keywords

UI audit, UX audit, accessibility audit, responsive audit, mobile review, loading state, empty state, design review, visual consistency, WCAG, Radix, shadcn, navigation audit, UI-001, tab navigation, component reuse, breakpoint review, screenshot gate.

---

## Prerequisites

- Read `UI_UX_GOVERNANCE.md` before beginning any audit. It is the authoritative source.
- Verify that the target UI components and screens are running or can be rendered in a test/local environment.
- Confirm the task branch matches the task category (e.g., `feat/`, `fix/`, `refactor/`).

---

## Authority Order

| Priority | Source |
|----------|--------|
| 1 | Repository Source Code |
| 2 | `UI_UX_GOVERNANCE.md` |
| 3 | **This Skill** (operational execution guide) |
| 4 | `AGENTS.md` |
| 5 | External Best Practices |

---

## Mandatory Pre-Implementation Phases

No code may be written until all ten phases are complete and approved.

```
Phase 1:  UI Audit
            ↓
Phase 2:  Mobile Review
            ↓
Phase 3:  Navigation Review
            ↓
Phase 4:  Accessibility Review
            ↓
Phase 5:  Component Search (packages/ui)
            ↓
Phase 6:  Performance Review
            ↓
Phase 7:  Responsive Validation (320px → 1440px)
            ↓
Phase 8:  Screenshot Evidence (Desktop + Tablet + Mobile)
            ↓
Phase 9:  Approval
            ↓
Phase 10: Implementation
```

---

## Auditing Workflow

For every UI/UX audit, execute all steps in order:

### 1. Read Governance Standard
- Open and read `UI_UX_GOVERNANCE.md`.
- Note the active merge gate conditions and UI PR checklist.

### 2. Responsive Review
- Verify correct layout adjustment at all required breakpoints.

| Breakpoint | Width |
|------------|-------|
| Mobile S   | 320px |
| Mobile M   | 375px |
| Tablet     | 768px |
| Laptop     | 1024px |
| Desktop    | 1440px |

- No horizontal scroll permitted.
- No overlapping or clipped elements.

### 3. Mobile-First Review
- Verify that mobile layout was designed first.
- Confirm touch targets meet 44×44px minimum.
- Confirm safe-area support on mobile viewports.

### 4. Navigation Review
- Identify all navigation structures.
- Verify tabs are used for related views (not dropdown menus or stacked lists).
- Flag any navigation that buries actions in menus when tabs could serve better.
- Verify bottom navigation is used for mobile where appropriate.

### 5. Accessibility Review
- Check WCAG AA color contrast on all text and interactive elements.
- Verify ARIA labels on icon-only buttons and interactive elements.
- Confirm semantic HTML structure (`<main>`, `<nav>`, `<section>`, `<button>`, etc.).
- Validate keyboard navigation — all interactive elements reachable via Tab key.
- Verify focus states are visible.
- Check Escape key closes overlays and drawers.

### 6. Touch Target Review
- Confirm all interactive targets (buttons, links, inputs) are at least 44×44px.

### 7. Component Search (Design System Compliance)
- Before recommending or creating any component, search `packages/ui`.
- Flag any case where a shared component exists but is not being used.
- Document justification if a new component is required.

| Component Type | Search Location |
|----------------|-----------------|
| Buttons        | `packages/ui`   |
| Cards          | `packages/ui`   |
| Inputs         | `packages/ui`   |
| Dialogs        | `packages/ui`   |
| Tables         | `packages/ui`   |
| Tabs           | `packages/ui`   |
| Badges         | `packages/ui`   |
| Alerts         | `packages/ui`   |

### 8. Overlay & Dialog Review
- Verify modals and drawers trap focus correctly.
- Confirm Escape key closes overlays.
- Verify clean animation transitions.
- Confirm responsive drawer (mobile) vs. dialog (desktop) pattern is followed.

### 9. Forms & Validation Review
- Check label associations and helper text.
- Verify inline error alerts with clear messages.
- Confirm disabled and invalid state styling.
- Check autofill and keyboard navigation support.

### 10. Boundary States Review
- Verify loading state (skeleton preferred over spinner for long loads).
- Verify empty state (icon + explanation + primary action).
- Verify error state (message + retry option).
- Verify offline state handling where applicable.

### 11. Visual & Token Review
- Audit page margins and spacing for consistency.
- Verify design tokens are used (no hardcoded color, font, or spacing values).
- Check typography weights, sizes, and hierarchy.
- Verify consistent border radius, shadows, and icon usage.

### 12. Performance Review
- Audit for Cumulative Layout Shift (CLS).
- Check for unnecessary re-renders.
- Verify lazy-loading of heavy components.
- Check list virtualization for large datasets.
- Verify image optimization.

### 13. Screenshot Evidence Collection
- Capture and attach screenshots at all required viewports:

| Evidence            | Viewport |
|---------------------|----------|
| Desktop Screenshot  | 1440px   |
| Tablet Screenshot   | 768px    |
| Mobile Screenshot   | 375px    |
| Mobile S Screenshot | 320px    |

Screenshots must be attached to the GitHub issue and PR before review.

### 14. UX Quality Scoring
- Score the implementation against these targets:

| Metric | Target |
|--------|--------|
| Mobile Friendliness | 100% |
| Accessibility | WCAG AA |
| Navigation Clarity | Excellent |
| Scrolling Efficiency | Minimal |
| Visual Consistency | High |
| Component Reuse | Maximum |

---

## Audit Deliverables

Every UI/UX audit must produce:

1. Executive summary
2. Governance compliance status (UI-001)
3. Critical issues (merge blockers)
4. Accessibility issues
5. Mobile & responsive issues
6. Navigation issues
7. Component reuse violations
8. Visual consistency issues
9. Performance observations
10. UX quality scorecard
11. Screenshot evidence (all required breakpoints)
12. Priority matrix
13. Estimated effort

---

## UI Pull Request Checklist

Every UI pull request must verify all items below before merge is permitted:

```
UI-001 Pull Request Checklist

[ ] Mobile-first layout implemented
[ ] Responsive at all required breakpoints (320px, 375px, 768px, 1024px, 1440px)
[ ] Tabs used instead of deep menus where appropriate
[ ] Buttons aligned consistently
[ ] Consistent spacing applied
[ ] No horizontal scrolling
[ ] Loading state implemented
[ ] Empty state implemented
[ ] Error state implemented
[ ] Accessibility verified (WCAG AA)
[ ] Shared components reused (packages/ui searched first)
[ ] Desktop screenshot attached
[ ] Tablet screenshot attached
[ ] Mobile screenshot attached
[ ] All UI-001 merge gate conditions cleared
```

---

## Merge Gate Enforcement

Block merge if any of the following exist:

- Mobile layout is broken.
- Responsive layout breaks at any required breakpoint.
- Excessive scrolling on primary workflow.
- Misaligned buttons.
- Inconsistent spacing or typography.
- Navigation confusion (deep menus used instead of tabs).
- Overflow issues.
- Poor accessibility (fails WCAG AA).
- Duplicate UI components introduced without justification.
- Existing shared component from `packages/ui` ignored without justification.
- Missing loading, empty, or error states.
- Touch targets smaller than 44×44px.
- Desktop and mobile screenshots not attached to PR.

---

## Boundaries

**When to Use:**
- Proposing visual audits, contrast audits, or layout checks.
- Reviewing mobile layout wrapping, text overflow, and container sizing.
- Auditing accessibility compliance (color contrast, keyboard focus trap, ARIA).
- Verifying implementation of standard states (loading, empty, error, active).
- Reviewing navigation structure for tab vs. menu decisions.
- Enforcing component reuse from `packages/ui`.

**When NOT to Use:**
- Backend server logic or database migrations → use **ci-investigation** or **architecture-review**.
- Package design or API schema creation → use **architecture-review**.
- Writing or modifying governance validators/fixers → use **governance-audit**.
- Managing git branches or commit staging → use **git-workflow**.
- Final pull request merge readiness checklists → use **pr-review**.

---

## Non-Goals

This skill never:

- Overrides `UI_UX_GOVERNANCE.md`.
- Implements production CSS styling or component logic unless explicitly requested.
- Writes backend REST API endpoints.
- Implements static code validators.
- Publishes or manages documentation files.
- Operates git branch commands.

---

## Reuse Policy

Before proposing UI components or layout configurations:

- Search `packages/ui` first.
- Search existing shared layout templates and component guides.
- Reuse existing shadcn components, Radix primitives, design tokens, and Tailwind utilities.
- Prefer extending existing design patterns.
- Avoid introducing one-off utility classes.
- Follow existing component composition patterns.
- Do not create custom styling wrappers if shared design tokens are available.

---

## Skill Relationships

Primary:
- ui-ux

Governs:
- `UI_UX_GOVERNANCE.md` (authoritative standard — this skill operationalizes it)

Collaborates with:
- architecture-review
- documentation
- pr-review

Does Not Replace:
- governance-audit
- architecture-review
- ci-investigation
- documentation
- git-workflow
