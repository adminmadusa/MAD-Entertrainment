---
owner: MAD Engineering Governance
---

# MAD UI/UX Governance Standard

| Field | Value |
|-------|-------|
| **Standard** | UI-001 |
| **Version** | 1.3.0 |
| **Status** | Active |
| **Owner** | MAD Engineering Governance |
| **Approver** | Engineering Lead |
| **Effective Date** | 2026-07-07 |
| **Last Updated** | 2026-07-15 |
| **Supersedes** | 1.2.0 |
| **Review Frequency** | Quarterly |
| **Related Standards** | None (SSOT) |
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

## Section 0.5 — 4-Layer UI Governance Model

All UI development must adhere to the 4-layer architecture. Components must not skip layers or redefine lower-layer responsibilities.

### Layer 1: Design Tokens
The foundational visual design variables (colors, typography, spacing, radii, shadows). Defined exclusively in `packages/ui/src/tailwind/preset.ts`. No hardcoded hex codes, arbitrary pixel values, or ad-hoc style values are permitted in any application.

### Layer 2: UI Primitives
The lowest-level functional building blocks (Button, Input, Checkbox, Badge). Found in `packages/ui/src/primitives`. They have no business logic and rely entirely on Layer 1 tokens for styling.

### Layer 3: UI Composites
Combinations of UI Primitives that form reusable patterns (Modal, Drawer, Table, FormField, ErrorState). Found in `packages/ui/src/composites`. These components manage their own internal UI state but remain domain-agnostic.

### Layer 4: Features & Pages
Application-specific layouts, pages, and smart components. Found in `apps/web` or `apps/admin`. These assemble Layer 3 Composites and Layer 2 Primitives, inject business logic, fetch data, and manage application state.

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

Every UI audit and PR must verify correct rendering at the **Core Breakpoints**. These require screenshot evidence (see Section 24) and are the basis for the merge gate and scorecard.

| Breakpoint | Width |
|------------|-------|
| Mobile S   | 320px |
| Mobile M   | 375px |
| Tablet     | 768px |
| Laptop     | 1024px |
| Desktop    | 1440px |

In addition, every UI audit must spot-check rendering at the **Extended Widths** below, since these represent the most common real-world device viewports. No screenshot evidence is required at these widths, but any layout break found at them is a merge-blocking finding under Section 24, same as a Core Breakpoint break.

| Extended Width | Represents |
|-----------------|------------|
| 360px | Common Android device width |
| 390px | iPhone 12/13/14/15 |
| 430px | iPhone Pro Max |

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
- Render input text at a minimum of 16px on any device. Smaller sizes trigger unwanted zoom-on-focus on iOS Safari, which breaks layout on refocus/blur.

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

### Required Verification Methods

Accessibility compliance must be verified, not assumed:

- Keyboard-only navigation test (no mouse).
- Screen reader label verification.
- Automated contrast audit against WCAG AA (e.g. axe, Lighthouse), not a visual eyeball check.

### Motion Accessibility

- Respect the user's `prefers-reduced-motion` setting: when set, non-essential animation and transition effects must be disabled or reduced to a near-instant state change.
- Never convey essential information (state changes, errors, required actions) through animation alone — pair it with a static, non-animated indicator (text, icon, color).
- Where an animation is decorative rather than essential, it must be safely removable without any loss of function.

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

No component may use a hardcoded color, spacing, radius, or size value. Every value must resolve to a defined design token, regardless of the styling technology in use (CSS-in-JS, Tailwind, plain CSS, or otherwise).

New design tokens must be added to the shared design system rather than introduced ad hoc within individual components.

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

### Performance Budgets

| Metric | Budget |
|--------|--------|
| Cumulative Layout Shift (CLS) | < 0.1 |
| Image dimensions | Must be declared (explicit width/height or aspect-ratio) on every image, no exceptions |
| Hydration | No visible layout shift between server-rendered and hydrated state |
| Re-renders | No component re-renders on state changes it does not depend on (verify with React DevTools Profiler) |

A screen exceeding the CLS budget or shipping an image without declared dimensions is a merge-blocking finding under Section 26.

---

## 19. Sticky CTA & Safe-Area Standard

Any mobile screen built around a single primary action (checkout, confirmation, submission) must anchor that action in a persistent bottom bar rather than placing it at the end of scrollable content — the primary action must always be reachable without scrolling.

Requirements:

- Persistent action bar anchored to the viewport bottom, always visible while the screen is active.
- Account for device safe areas (e.g. the iOS home indicator) so the action bar is never obscured or overlapped by system UI.
- Scrollable page content must reserve space equal to the action bar's height so the last content item is never hidden behind it.
- A screen uses either a persistent bottom tab navigation **or** a persistent primary-action bar — never both stacked in the same screen. Tab-nav screens requiring a quick action use a floating action affordance instead.
- Overlapping UI surfaces (bottom navigation, sticky action bars, dropdowns, modals, toasts) must follow a defined stacking order so a higher-priority surface (e.g. a modal) always renders above a lower-priority one (e.g. a sticky action bar), with no ad hoc per-component stacking values.

---

## 20. Overlay & Modal Interaction Standard

Applies to any dismissible overlay surface — modal, dialog, drawer, bottom sheet, or popover.

### Required close behavior

All three must work on every overlay, with no exceptions:

- An explicit close control, with a minimum 44×44px hit target.
- Tapping/clicking the backdrop dismisses the overlay, without dismissing it when the click originates inside the overlay's own content.
- The Escape key dismisses the overlay for keyboard users.

### Required accessibility markup

- The overlay container is marked as a dialog and as modal to assistive technology.
- The overlay is labelled — by its visible title where one exists, or by a short description where it doesn't.
- Focus is trapped within the overlay while it is open (keyboard focus does not leak to content behind it).
- Focus is restored to the triggering element when the overlay closes. Any generated ID used for this labelling must be stable and collision-safe across server-rendered and client-rendered output, using whatever mechanism the framework in use provides for that (e.g. React's `useId()`).

### Required background behavior

- Background scroll must be locked for the entire duration any overlay is open, including on platforms (notably iOS Safari) where a simple overflow rule does not stop scrolling and a more complete lock is required.
- The scroll position of the page behind the overlay must be preserved and restored when the overlay closes.

### Reuse requirement

This is the Component-First Rule (Section 17) applied to interaction behavior, not just visual markup: every overlay-type component must consume a single shared implementation of this close/scroll-lock/focus behavior rather than each component reimplementing it independently. A component that duplicates this logic instead of reusing the shared implementation is a governance violation for the same reason a duplicated visual component is — it creates a second place for the behavior to drift out of sync.

---

## 21. Browser Compatibility Standard

Every UI feature must render and function correctly on:

- Chrome
- Safari (macOS and iOS)
- Firefox
- Edge

This is not optional for features that rely on sticky positioning, overlays, focus management, or scroll locking (Sections 19–20), since these behave inconsistently across engines — most notably iOS Safari, which requires explicit handling already called out in Section 20's background-behavior requirements.

### Minimum Verification

- Manual smoke test on Safari iOS for any screen using sticky positioning, overlays, or scroll locking.
- Manual smoke test on the remaining three browsers for any screen with novel layout or interaction patterns (i.e. not a straightforward reuse of an already-verified shared component).
- A screen that only reuses existing, already-verified shared components (Section 17) does not require a fresh cross-browser pass.

Cross-browser verification failures are a merge-blocking finding under Section 26, same as a responsive layout break.

---

## 22. Sticky Table & Data Grid Standard

Applies to any data grid or table that uses sticky headers, sticky columns, or both (e.g. admin data grids).

Requirements:

- Header row remains visible (sticky) during vertical scroll.
- The identifier column (e.g. ID, name, or primary key) remains visible (sticky) during horizontal scroll.
- Any action column (edit/delete/etc.) remains visible (sticky) during horizontal scroll.
- Sticky headers and sticky columns use the shared stacking-order tokens from Section 19, not ad hoc per-component z-index values.
- No table content is ever visible underneath a sticky header or sticky column — sticky cells must have a solid background token, not a transparent one.

A duplicated sticky-table implementation instead of a shared one is a governance violation under the Component-First Rule (Section 17).

---

## 23. Mandatory UI Audit Phases

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
7.  Performance Review  — Lazy-load, virtualization, CLS budget, re-render check
      ↓
8.  Responsive Validation — Test at 320px, 375px, 768px, 1024px, 1440px; spot-check 360px, 390px, 430px
      ↓
9.  Cross-Browser Review — Chrome, Safari (macOS + iOS), Firefox, Edge where required by Section 21
      ↓
10. Screenshot Evidence — Capture and attach desktop + tablet + mobile shots
      ↓
11. Approval            — Receive sign-off before proceeding
      ↓
12. Implementation      — Build against the approved wireframe
```

---

## 24. Required Audit Evidence

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

## 25. UI Governance Scorecard

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

## 26. Merge Gate

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
- [ ] Input font size below 16px on any device.
- [ ] Hardcoded color, spacing, radius, or size value not resolved to a design token.
- [ ] Overlay (modal/drawer/sheet/popover) missing required close behavior, ARIA markup, focus trap/restoration, or background scroll lock.
- [ ] Overlay behavior reimplemented in a component instead of reusing the shared implementation.
- [ ] Sticky CTA missing safe-area handling, or stacked directly on top of a bottom tab nav.
- [ ] Layout break on Safari iOS, Safari macOS, Chrome, Firefox, or Edge for a screen requiring cross-browser verification under Section 21.
- [ ] Animation does not respect `prefers-reduced-motion`, or essential information is conveyed by animation alone.
- [ ] New design token introduced ad hoc in a component instead of the shared design system.
- [ ] CLS budget exceeded, or an image shipped without declared dimensions.
- [ ] Sticky data grid missing sticky header, sticky identifier column, sticky action column, or reimplementing sticky-table behavior instead of reusing the shared implementation.

All checkboxes must be cleared before merge is permitted.

---

## 27. UI Pull Request Checklist

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
[ ] Extended-width spot check (360px, 390px, 430px) performed
[ ] Cross-browser check performed (Chrome, Safari macOS, Safari iOS, Firefox, Edge) where required by Section 21
[ ] prefers-reduced-motion respected; no essential info conveyed by animation alone
[ ] All new colors/spacing/radii/sizes resolve to shared design tokens (no ad hoc tokens)
[ ] Performance budgets met (CLS < 0.1, image dimensions declared)
[ ] Sticky table requirements met (if applicable)
[ ] All UI-001 merge gate conditions cleared
```

---

## 28. AI Execution Rules

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
Responsive Validation (320px → 1440px, spot-check 360/390/430px)
  ↓
Cross-Browser Review (Chrome, Safari macOS + iOS, Firefox, Edge)
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

## 29. Related Standards

This document is the authoritative UI/UX policy. The following documents provide detailed implementation guidance for specific sub-domains. Each is subordinate to this document.

| Document | Scope | Status |
|----------|-------|--------|

If any sub-document conflicts with this document, this document takes precedence.

---

## Change Log

| Version | Date       | Author                       | Description |
|---------|------------|------------------------------|-------------|
| 1.3.0   | 2026-07-15 | MAD Engineering Governance   | Add Section 21 (Browser Compatibility Standard) and Section 22 (Sticky Table & Data Grid Standard); expand Section 2 breakpoints with 360px/390px/430px extended-width spot checks; add motion accessibility rules to Section 15; add ad hoc token prohibition to Section 16; add measurable performance budgets to Section 18; expand Merge Gate, PR Checklist, Audit Phases, and AI Execution Rules with cross-browser, motion, token, performance, and sticky-table conditions; renumber former Sections 21–27 to 23–29 |
| 1.2.0   | 2026-07-15 | MAD Engineering Governance   | Add Section 19 (Sticky CTA & Safe-Area Standard) and Section 20 (Overlay & Modal Interaction Standard); add 16px minimum input font-size rule to Section 8; add explicit token-only rule to Section 16; add accessibility verification methods to Section 15; expand Merge Gate with overlay, sticky CTA, and token-only conditions; renumber former Sections 20–25 to 22–27 |
| 1.1.0   | 2026-07-07 | MAD Engineering Governance   | Add Section 0 (wireframe-first gate); expand Section 19 to 11 phases; upgrade Section 21 to full governance scorecard; add Section 25 (Related Standards); expand metadata header with Approver, Effective Date, Supersedes, Review Frequency |
| 1.0.0   | 2026-07-07 | MAD Engineering Governance   | Initial standard (UI-001) |
