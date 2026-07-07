# MAD UI/UX Governance Standard

| Field | Value |
|-------|-------|
| **Standard** | UI-001 |
| **Version** | 1.1.0 |
| **Status** | Active |
| **Owner** | MAD Engineering Governance |
| **Approver** | Engineering Lead |
| **Effective Date** | 2026-07-07 |
| **Last Updated** | 2026-07-07 |
| **Supersedes** | N/A (initial standard) |
| **Review Frequency** | Quarterly |
| **Related Standards** | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [COMPONENT_GUIDELINES.md](COMPONENT_GUIDELINES.md), [RESPONSIVE_GUIDELINES.md](RESPONSIVE_GUIDELINES.md), [ACCESSIBILITY_GUIDELINES.md](ACCESSIBILITY_GUIDELINES.md), [INTERACTION_GUIDELINES.md](INTERACTION_GUIDELINES.md), [UI_PATTERNS.md](UI_PATTERNS.md) |
| **Related Documents** | [AGENTS.MD](AGENTS.MD), [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md), [ARCHITECTURE.md](ARCHITECTURE.md), [.agents/skills/ui-ux/SKILL.md](.agents/skills/ui-ux/SKILL.md) |

---

## Governance Authority

This document is the **Single Source of Truth (SSOT)** for all UI/UX standards in the MAD Entertrainment repository.

### Authority Order

| Priority | Source |
|----------|--------|
| 1 | Repository Source Code |
| 2 | **UI_UX_GOVERNANCE.md** (this document) |
| 3 | Skill Documentation (`.agents/skills/ui-ux/SKILL.md`) |
| 4 | `AGENTS.md` |
| 5 | External Best Practices |

If any conflict exists between this document and any skill, rule, or external reference, this document takes precedence.

No UI standard may be introduced in a skill or AGENTS.md without first being added here.

---

## Section 0 — Implementation Gate (Mandatory)

> **No UI implementation may begin until the proposed user flow and layout have been reviewed and approved.**

This rule is non-negotiable. AI agents and human developers are both subject to it.

### Required Implementation Sequence

```
1. UI Audit         — Audit the existing page/feature for compliance gaps
      ↓
2. Wireframe         — Produce a wireframe or layout proposal (mobile-first)
      ↓
3. Mobile-First Review — Review the wireframe at 320px–375px
      ↓
4. Approval          — Receive explicit approval before writing code
      ↓
5. Implementation    — Build against the approved wireframe
```

### Why This Rule Exists

Without a wireframe gate, AI agents invent layouts during implementation. This produces inconsistent interfaces that require rework. The wireframe approval step forces layout decisions to happen before code, not during code.

### Wireframe Minimum Requirements

A wireframe must show:

- Page structure (header, main, sidebar, footer)
- Primary navigation pattern (tabs, bottom nav, sidebar)
- Above-the-fold content at mobile viewport (375px)
- Location of primary CTA
- Loading, empty, and error state placeholders

Wireframes may be sketched, digital mockups, or annotated screenshots of similar patterns. They do not require pixel-perfect fidelity.

---

## Purpose

Every UI implementation must deliver a modern, consistent, responsive, and user-friendly experience across all supported devices.

UI development is not complete until it satisfies all rules defined in this document.

---

## 1. Mobile-First Principle (Highest Priority)

Every screen MUST be designed for mobile first.

Desktop is an enhancement, not the primary target.

Requirements:

- Mobile layout designed before desktop.
- No horizontal scrolling.
- Responsive from 320px width and above.
- Touch-friendly spacing.
- Buttons easily tappable.
- Forms usable with one hand.
- Safe-area support.
- Responsive typography.
- Responsive spacing.
- Responsive cards.

Failure to meet mobile usability blocks implementation approval.

---

## 2. Responsive Design

Every page must work on:

- Mobile
- Tablet
- Laptop
- Desktop
- Large Displays

No broken layouts. No overlapping elements. No clipped content. No hidden actions.

### Required Breakpoint Verification

Every UI audit and PR must verify correct rendering at:

| Breakpoint | Width |
|------------|-------|
| Mobile S   | 320px |
| Mobile M   | 375px |
| Tablet     | 768px |
| Laptop     | 1024px |
| Desktop    | 1440px |

---

## 3. Navigation Rules

Avoid long vertical navigation lists.

Prefer:

- Tabs
- Segmented Controls
- Bottom Navigation (Mobile)
- Secondary Tabs
- Context Tabs

Do NOT place many actions inside one dropdown menu if they can be organized as tabs.

Tabs improve:

- Discoverability
- Navigation speed
- Reduced scrolling
- Better mobile usability

---

## 4. Tab Navigation Standard

Use tabs whenever multiple related views exist.

**Examples:**

Tickets → `[Active]` `[Scanned]` `[Failed]` `[Cancelled]`

Scanner → `[Scan]` `[History]` `[Statistics]`

Dashboard → `[Overview]` `[Analytics]` `[Reports]` `[Settings]`

Avoid multiple stacked menus that require excessive navigation.

---

## 5. Reduce Scrolling

Minimize unnecessary scrolling.

Rules:

- Important information above the fold.
- Group related content.
- Use collapsible sections.
- Use tabs for related datasets.
- Paginate large lists.
- Lazy-load secondary content.

Avoid "infinite pages" filled with stacked cards.

---

## 6. Visual Hierarchy

Every page must have:

- Clear page title.
- Supporting description.
- Primary action.
- Secondary actions.
- Proper section grouping.

Users should understand the page within five seconds.

---

## 7. Button Standards

Buttons must have:

- Consistent height.
- Consistent padding.
- Equal spacing.
- Proper alignment.
- Clear labels.
- Loading state.
- Disabled state.
- Hover state.
- Focus state.
- Success/Error feedback.

No floating or misaligned buttons.

---

## 8. Form Standards

Forms must:

- Validate inline.
- Show clear error messages.
- Preserve entered data.
- Support keyboard navigation.
- Support autofill.
- Minimize required fields.

---

## 9. Card Standards

Cards should:

- Have consistent spacing.
- Maintain equal widths.
- Use consistent shadows.
- Avoid nested cards unless required.
- Contain only related information.

Avoid oversized static containers with excessive empty space.

---

## 10. Dashboard Standards

Dashboards should prioritize information.

Order:

1. Summary Metrics
2. Status Indicators
3. Primary Actions
4. Detailed Data
5. History

Use KPI cards instead of long textual summaries.

---

## 11. Scanner UI Standard

Scanner pages should prioritize scanning efficiency.

Structure:

```
Header

  Total Tickets: 250
  Scanned: 30
  Failed: 2
  Remaining: 218

Tabs

  [Scan] [Scanned] [Failed]
```

The camera and scan action must remain the primary focus.

---

## 12. Tables & Lists

Large datasets should include:

- Search
- Filters
- Sort
- Pagination or Virtualization
- Bulk Actions (when applicable)

Avoid rendering extremely long lists without navigation aids.

---

## 13. Empty States

> **Enforced by**: [`VAL-UX-002`](docs/governance/rules/VAL-UX-002.md) — Missing Empty State

Every empty page should include:

- Friendly illustration or icon.
- Clear explanation.
- Primary action.
- Recovery guidance.

Never display a blank screen.

---

## 14. Loading Experience

> **Enforced by**: [`VAL-UX-001`](docs/governance/rules/VAL-UX-001.md) — Missing Loading State

Every asynchronous action must include:

- Skeleton loading.
- Progress indicators.
- Optimistic UI where appropriate.
- Retry option on failure.

Avoid layout shifts during loading.

---

## 15. Accessibility

> **Enforced by**: [`VAL-UI-020`](docs/governance/rules/VAL-UI-020.md) — Alt Text Missing | [`VAL-UX-003`](docs/governance/rules/VAL-UX-003.md) — Missing Error State

Every screen must support:

- Keyboard navigation.
- Visible focus states.
- Sufficient color contrast (WCAG AA minimum).
- Screen readers.
- Touch accessibility.
- ARIA attributes where appropriate.
- Minimum 44×44px touch targets.

---

## 16. Design Consistency

> **Enforced by**: [`VAL-UI-022`](docs/governance/rules/VAL-UI-022.md) — Hardcoded Inline Color | [`VAL-UI-024`](docs/governance/rules/VAL-UI-024.md) — Arbitrary Tailwind Spacing | [`VAL-UI-025`](docs/governance/rules/VAL-UI-025.md) — Duplicate Tailwind Utilities

Maintain a shared design system.

Standardize:

- Colors
- Typography
- Border radius
- Shadows
- Icons
- Buttons
- Inputs
- Cards
- Modals
- Spacing

No component should introduce a new visual style without justification.

---

## 17. Design System Compliance (Component-First Rule)

> **Enforced by**: [`VAL-UI-022`](docs/governance/rules/VAL-UI-022.md) — Hardcoded Inline Color

Before creating any UI element, search `packages/ui` first.

### Required Search Before Creating

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

Rules:

- If a reusable component exists → **reuse it**.
- If the component exists but lacks a feature → **extend it**.
- If no component exists → **justify creating a new one** in the PR description.

Creating a duplicate component without justification is a governance violation.

---

## 18. Performance

> **Enforced by**: [`VAL-UI-021`](docs/governance/rules/VAL-UI-021.md) — Image Missing Dimensions (CLS Risk) | [`VAL-UI-023`](docs/governance/rules/VAL-UI-023.md) — Overflow-X Hidden on Root Container

UI should:

- Lazy-load heavy components.
- Virtualize long lists.
- Optimize images.
- Avoid unnecessary re-renders.
- Minimize bundle size impact.

---

## 19. Mandatory UI Audit Phases

Before implementation, the following ten phases are mandatory. No code may be written until all phases are complete.

```
1.  UI Audit            — Audit existing page/feature for compliance gaps
      ↓
2.  Wireframe           — Produce layout proposal (mobile-first); get approval
      ↓
3.  Mobile Review       — Verify wireframe at 320px–375px before coding
      ↓
4.  Navigation Review   — Confirm tabs over deep menus; bottom nav on mobile
      ↓
5.  Accessibility Review — WCAG AA contrast, ARIA, keyboard, 44px targets
      ↓
6.  Component Search    — Search packages/ui; justify any new components
      ↓
7.  Performance Review  — Lazy-load, virtualization, CLS, re-render check
      ↓
8.  Responsive Validation — Test at 320px, 375px, 768px, 1024px, 1440px
      ↓
9.  Screenshot Evidence — Capture and attach desktop + tablet + mobile shots
      ↓
10. Approval            — Receive sign-off before proceeding
      ↓
11. Implementation      — Build against the approved wireframe
```

---

## 20. Required Audit Evidence

Every UI audit must produce photographic evidence at the required breakpoints.

### Mandatory Screenshots

| Evidence | Viewports Required |
|----------|--------------------|
| Desktop Screenshot  | 1440px |
| Tablet Screenshot   | 768px  |
| Mobile Screenshot   | 375px  |
| Mobile S Screenshot | 320px  |

Screenshots must be attached to the GitHub issue and the pull request before review begins.

---

## 21. UI Governance Scorecard

Every UI audit must score the implementation against these targets and produce an overall PASS or FAIL decision.

### Category Scores

| Category | Target | Score (0–100) | Status |
|----------|--------|---------------|--------|
| Mobile Friendliness | 100 | — | — |
| Accessibility (WCAG AA) | ≥90 | — | — |
| Navigation Clarity | ≥90 | — | — |
| Responsiveness | 100 | — | — |
| Visual Consistency | ≥90 | — | — |
| Component Reuse | ≥85 | — | — |
| Performance (CLS/Re-renders) | ≥85 | — | — |

### Overall Verdict

```
UI Governance Score: [TOTAL / 700]

Result: PASS   (all categories at or above target)
     or FAIL   (any category below target)
```

A **FAIL** verdict blocks merge regardless of other checklist items.

A **PASS** verdict does not bypass the merge gate — all merge gate conditions must still be individually cleared.

### Scoring Guidance

- **100**: Fully compliant, no findings.
- **90–99**: Minor findings, none merge-blocking.
- **70–89**: Moderate findings; document remediation plan.
- **<70**: Critical findings; merge blocked until remediated.

---

## 22. Merge Gate

A UI feature cannot be merged if any of the following exist:

- [ ] Mobile layout is broken.
- [ ] Responsive layout breaks at any required breakpoint.
- [ ] Excessive scrolling.
- [ ] Misaligned buttons.
- [ ] Inconsistent spacing.
- [ ] Inconsistent typography.
- [ ] Navigation confusion.
- [ ] Overflow issues.
- [ ] Poor accessibility (fails WCAG AA).
- [ ] Duplicate UI components introduced.
- [ ] Existing shared component ignored without justification.
- [ ] Inconsistent styling.
- [ ] Missing loading state.
- [ ] Missing empty state.
- [ ] Missing error state.
- [ ] Excessive nested menus used instead of tabs.
- [ ] Touch targets smaller than 44×44px.
- [ ] Desktop and mobile screenshots not attached to PR.

All checkboxes must be cleared before merge is permitted.

---

## 23. UI Pull Request Checklist

Every UI pull request must include this checklist in its description:

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

## 24. AI Execution Rules

Every AI agent implementing or auditing UI must follow this sequence without exception:

```
UI Audit
  ↓
Mobile Review
  ↓
Navigation Review
  ↓
Accessibility Review
  ↓
Component Search (packages/ui)
  ↓
Performance Review
  ↓
Responsive Validation (320px → 1440px)
  ↓
Screenshot Evidence
  ↓
Approval
  ↓
Implementation
```

No code before completing these steps.

No merge before clearing the merge gate.

---

## 25. Related Standards

This document is the authoritative UI/UX policy. The following documents provide detailed implementation guidance for specific sub-domains. Each is subordinate to this document.

| Document | Scope | Status |
|----------|-------|--------|
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Typography, color tokens, spacing, radius, elevation, iconography | Active |
| [COMPONENT_GUIDELINES.md](COMPONENT_GUIDELINES.md) | Component ownership, reuse, composition, deprecation | Active |
| [RESPONSIVE_GUIDELINES.md](RESPONSIVE_GUIDELINES.md) | Breakpoints, grid, container widths, fluid layouts | Active |
| [ACCESSIBILITY_GUIDELINES.md](ACCESSIBILITY_GUIDELINES.md) | Keyboard, focus, ARIA, WCAG AA requirements | Active |
| [INTERACTION_GUIDELINES.md](INTERACTION_GUIDELINES.md) | Loading, success, error, confirmation, animation budget | Active |
| [UI_PATTERNS.md](UI_PATTERNS.md) | Standard layouts: dashboard, form, scanner, table, dialog, wizard | Active |

If any sub-document conflicts with this document, this document takes precedence.

---

## Change Log

| Version | Date       | Author                       | Description |
|---------|------------|------------------------------|-------------|
| 1.1.0   | 2026-07-07 | MAD Engineering Governance   | Add Section 0 (wireframe-first gate); expand Section 19 to 11 phases; upgrade Section 21 to full governance scorecard; add Section 25 (Related Standards); expand metadata header with Approver, Effective Date, Supersedes, Review Frequency |
| 1.0.0   | 2026-07-07 | MAD Engineering Governance   | Initial standard (UI-001) |
