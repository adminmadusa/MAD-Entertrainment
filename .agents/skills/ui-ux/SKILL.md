---
name: "ui-ux"
description: "Repository-aware UI/UX investigator enforcing feature-scoped audits for MAD UI/UX Governance (UI-001). Adaptively audits component reuse, React architecture, design tokens, responsiveness, and accessibility based on the specific feature context."
version: "4.1"
owner: "UI/UX Designer"
last_updated: "2026-07-14"
depends_on: "None"
supersedes: "4.0"
scope: "UI-UX"
priority: "Supporting"
governance_standard: "UI-001"
governance_document: "UI_UX_GOVERNANCE.md"
---

# UI & UX Auditing Skill — v4.1

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

Audits must transition from simple code reviews to **true experience audits** by combining repository evidence, runtime interaction scenarios, and visual validation.

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
Repository Context Diagram
        ↓
Component Inventory
        ↓
Determine Applicable Audits
        ↓
Collect Repository Evidence
        ↓
Collect Visual Evidence
        ↓
Collect Interaction Evidence
        ↓
Generate Quality Summary
```

---

## Repository Context Diagram (Mandatory)

Every audit must include a hierarchical diagram showing how the feature is composed from the route down to the backend API. This helps reviewers understand the architecture quickly.

Example:
```text
Login
↓
Auth Layout
↓
AuthForm
├── LoginForm
├── OtpVerifyForm
└── ProfileCompletionForm
↓
useAuth
↓
React Query
↓
public.service.ts
↓
Backend API
```

---

## Mandatory Evidence Sections

Instead of a generic list of findings, every audit must be categorized into three mandatory evidence sections. Every issue must reference one or more of these.

### 1. Repository Evidence (Deep Code Trace)

Do not provide shallow evidence like "File: AuthForm.tsx". You must explain **why** the conclusion was reached by tracing the code logic.

You must explicitly distinguish the nature of your finding:
- `Verified by code inspection`
- `Likely behavior`
- `Runtime verification required`

Never recommend a refactor (e.g., moving state) based solely on static inspection without answering:
* Is the state actually causing a measurable issue?
* Is it shared by multiple child components intentionally?
* Would moving it duplicate state or complicate the flow?

### 2. Visual Evidence

A true UI audit requires visual proof. Verify and document:
* Screenshots (where applicable/requested)
* Viewport widths and breakpoints
* Overflow detection
* Spacing issues
* Alignment
* Layout consistency

### 3. Interaction Evidence

The audit must document simulated user behavior and edge cases. Do not rely entirely on static analysis. Verify:
* Spam clicking CTAs
* Rotating the device/phone
* Invalid input handling (e.g., pasting invalid OTPs)
* Network disconnects during critical actions
* Switching tabs during countdowns/polling
* Browser back button behavior
* Keyboard open/close layout shifts
* Slow network simulations

---

## Reuse, Consistency & Duplication Audits

### Component Reuse Audit
Verify whether the feature reuses existing shared components instead of creating local duplicates. You **must** provide a Component Inventory with a Duplicate Score:

```text
Component Inventory

Shared
Button ✓
Input ✓
Alert ✓

Local
OtpVerifyForm
LoginForm

Duplicate Score
0 duplicates found
```

### Consistency Audit
Verify visual and structural consistency across similar flows (e.g., Login vs Signup, or Login vs Profile Completion).
* Are headings identical?
* Are button styles consistent?
* Are animations reused?
* Are spacing tokens consistent?

### Design Token Verification
Do not just look for hardcoded values. Explicitly verify the usage of:
* CSS variables
* Tailwind theme tokens
* Semantic colors
* Spacing scale
* Typography tokens

---

## Final Quality Summary

End the audit with a simple, standardized quality summary table to give stakeholders an immediate understanding of the feature's health.

| Category           | Result         |
| ------------------ | -------------- |
| Mobile UX          | ✅ Pass / ⚠ / ❌|
| Desktop UX         | ✅ Pass / ⚠ / ❌|
| Accessibility      | ✅ Pass / ⚠ / ❌|
| Performance        | ✅ Pass / ⚠ / ❌|
| Component Reuse    | ✅ Pass / ⚠ / ❌|
| Design System      | ✅ Pass / ⚠ / ❌|
| Backend Alignment  | ✅ Pass / ⚠ / ❌|
| Repository Hygiene | ✅ Pass / ⚠ / ❌|

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
