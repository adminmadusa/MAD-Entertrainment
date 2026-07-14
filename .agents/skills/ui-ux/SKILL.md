---
name: "ui-ux"
description: "Repository-aware UI/UX investigator enforcing feature-scoped audits for MAD UI/UX Governance (UI-001). Adaptively audits component reuse, React architecture, design tokens, responsiveness, and accessibility based on the specific feature context."
version: "4.0"
owner: "UI/UX Designer"
last_updated: "2026-07-14"
depends_on: "None"
supersedes: "3.0"
scope: "UI-UX"
priority: "Supporting"
governance_standard: "UI-001"
governance_document: "UI_UX_GOVERNANCE.md"
---

# UI & UX Auditing Skill — v4.0

## Governing Standard

This skill is **operationally subordinate** to `UI_UX_GOVERNANCE.md`.

Rules:

- Never override `UI_UX_GOVERNANCE.md`.
- If a conflict exists between this skill and `UI_UX_GOVERNANCE.md`, follow `UI_UX_GOVERNANCE.md`.
- Any new UI standard must be added to `UI_UX_GOVERNANCE.md` first, then reflected here.
- Read `UI_UX_GOVERNANCE.md` at the start of every UI audit.

---

## Purpose

Operationalize the MAD UI/UX Governance Standard (UI-001) by acting as a feature-scoped investigator. Instead of scanning the entire repository, this skill narrows the scope to a specific feature (e.g., Login Screen, Dashboard) and adaptively discovers context, component reuse, accessibility issues, and React architecture relevant only to that feature.

---

## Trigger Keywords

UI audit, UX audit, accessibility audit, responsive audit, mobile review, loading state, empty state, design review, visual consistency, WCAG, Radix, shadcn, navigation audit, UI-001, tab navigation, component reuse, breakpoint review, screenshot gate, feature audit.

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

## Execution Strategy

Do not perform a full repository audit. Audits must be **feature-scoped**.

First discover the feature context.

**Scope: [Feature Name]** (e.g., Login Screen, Checkout, Dashboard)

**Discovery Tree:**
├── Locate feature route/page
├── Identify layout
├── Identify imported components
├── Identify shared UI components
├── Identify business/domain flow (e.g., auth flow, payment flow)
├── Identify form/validation libraries
├── Identify API endpoints
├── Identify state management
└── Identify authentication/backend providers

Only audit artifacts that are relevant to this specific feature scope.
Never scan unrelated parts of the repository.

---

## Auditing Workflow

```text
Feature Discovery
        ↓
Page/Route Discovery
        ↓
Component Inventory
        ↓
Dependency Analysis
        ↓
Determine Applicable Audits (e.g., Auth UX, Form Audit)
        ↓
Run Only Relevant Audits
        ↓
Collect Evidence
        ↓
Generate Findings
```

---

## Adaptive Execution

Only run audits relevant to the discovered feature scope.

Examples for a Login Screen feature:
- If authentication flows exist → Audit Auth UX (OTP, cooldown, session persistence).
- If forms exist → Audit Form UX (accessibility, autofill, focus management).
- If dialogs exist → Audit dialogs (focus trap, ARIA).
- If API calls exist → Audit Integration UX (validation mapping, error handling).

If no matching artifact exists, skip that audit without reporting it.

---

## Evidence Requirements

Every finding should explicitly include:

```text
Severity: [Critical / High / Medium / Low]
Confidence: [High / Medium / Low]

Evidence:
- File: [path]
- Component: [name]
- Line/function: [where possible]

Impact: [User or repository impact]

Recommendation: [Actionable fix]
```

Do not speculate. If evidence cannot be found, explicitly state:
"Not enough repository evidence."

---

## Reuse & Duplication Audits

### Component Reuse Audit

Verify whether the feature reuses existing shared components instead of creating local duplicates. Check for existing:
- Buttons, Inputs, OTP Inputs, Cards, Dialogs, Loaders, Alerts, Toasts

Before recommending reuse:
1. Search shared UI packages.
2. Search local feature components.
3. Compare APIs and responsibilities.
4. Determine whether consolidation is safe.

Never recommend replacing a component solely because it has a similar name.

### Duplicate Detection

Only report duplicates when behavior substantially overlaps within the scope of the feature and the shared `packages/ui`.

---

## Specialized Audits

### React Audit
- Unnecessary rerenders
- State ownership
- React Query usage (if applicable)
- Hydration issues
- Memoization
- Client/server boundaries
- Effect dependencies

### Design System Audit
Check adherence to the project's design system:
- Colors, Typography, Spacing, Border radius, Shadows, Icons, Motion, Dark mode

### Mobile UX Audit
- Responsive layout (320px → 1440px)
- Safe area handling
- Touch targets (≥44×44 px)
- Keyboard behavior and scroll behavior
- Viewport handling

### Accessibility Audit
- WCAG compliance and Color contrast
- ARIA attributes and Screen reader support
- Focus indicators and Tab order
- Error announcements

### Authentication / Backend Integration Audit
Verify alignment with the backend for the specific feature:
- API contract, Request/response shape
- Validation consistency and Error mapping
- Token handling / session behavior
- Rate limiting / cooldowns

---

## Final Deliverables

The audit should end with:

* Executive Summary
* Critical Issues
* High-Priority Improvements
* Accessibility Findings
* Mobile UX Findings
* Component Reuse Opportunities
* Backend Alignment Issues
* Performance Findings
* Repository Hygiene Findings
* Prioritized Action Plan (Fix Now → Fix Next → Technical Debt)

---

## Boundaries

**When to Use:**
- Conducting adaptive feature-scoped audits of React applications.
- Proposing visual audits, contrast audits, or layout checks for a specific screen.
- Reviewing mobile layout wrapping, text overflow, and container sizing.
- Auditing accessibility compliance (color contrast, keyboard focus trap, ARIA).
- Verifying implementation of standard states (loading, empty, error, active).
- Enforcing component reuse from `packages/ui`.

**When NOT to Use:**
- Full repository architecture reviews → use **architecture-review**.
- Writing or modifying governance validators/fixers → use **governance-audit**.

---

## Skill Relationships

Primary:
- ui-ux

Governs:
- `UI_UX_GOVERNANCE.md` (authoritative standard — this skill operationalizes it)
