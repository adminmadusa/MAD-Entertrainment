---
name: "ui-ux"
description: "Auditing user interfaces for mobile responsive layout wrapping, WCAG accessibility compliance, loading states, and component consistency."
version: "1.0"
owner: "UI/UX Designer"
last_updated: "2026-07-03"
depends_on: "None"
supersedes: "None"
scope: "UI-UX"
priority: "Supporting"
---

# UI & UX Auditing Skill

## Purpose
Guide the systematic auditing of front-end layouts for visual consistency, mobile layout wrapping, and accessibility standards.

## Trigger Keywords
UI audit, UX audit, accessibility audit, responsive audit, mobile review, loading state, empty state, design review, visual consistency, WCAG, Radix, shadcn, navigation audit.

## Prerequisites
- Verify that the target UI components and screens are running or can be rendered in a test/local environment.
- Read global design standards in `AGENTS.MD` before beginning an audit.

## Auditing Workflow
For every UI/UX audit:
1. **Responsive review**: Verify that the layout adjusts correctly down to 320px with no horizontal scroll or text overlaps.
2. **Accessibility review**: Check WCAG color contrast, ARIA labels, semantic structure, and screen reader announcements.
3. **Keyboard & Focus review**: Validate that all interactive targets are keyboard-navigable and have visible focus states.
4. **Touch Target review**: Ensure all interactive targets (buttons, links, inputs) have a minimum dimension of 44x44px.
5. **Overlay & Dialog review**: Verify that modals and drawers trap focus, handle Escape to close, and display clean animation transitions.
6. **Forms & Validation review**: Check label associations, error alerts, disabled states, and invalid state styling.
7. **Boundary States review**: Verify the presentation of loading placeholders, empty templates, network-offline handling, and error states.
8. **Navigation review**: Confirm visual and behavioral alignment of headers, sidebar menus, and site footers.
9. **Visual & Token review**: Audit page margins, typography weights, color styling, and verify that design tokens are used (no hardcoded visual constants).
10. **Performance review**: Audit layouts for layout shift (CLS), scroll performance, animation smoothness, rendering cost, unoptimized images, and unnecessary re-renders.
11. **Final recommendations**: Output an audit report according to the standard deliverables.

## Audit Deliverables
Every UI/UX audit must produce:
- Executive summary
- Critical issues
- Accessibility issues
- Mobile issues
- Responsive issues
- Visual consistency issues
- Performance observations
- Recommendations
- Priority matrix
- Estimated effort

## Responsibilities
- Conducting visual, layout, and contrast audits.
- Reviewing mobile layout wrapping, text overflow, and container sizing.
- Auditing accessibility compliance (color contrast, keyboard focus trap, ARIA tags).
- Verifying the implementation of standard states (loading, empty, error, active).

## Boundaries
- **When to Use**:
  - Proposing visual audits, contrast audits, or layout checks.
  - Reviewing the presentation of data-fetching fallback states (loading/empty indicators).
  - Inspecting responsive drawer/dialog behavior.
- **When NOT to Use**:
  - For backend server logic or database migrations (use **ci-investigation** or **architecture-review**).
  - For package design or API schema creation (use **architecture-review**).
  - For implementing or writing CSS rules or React component features directly (this skill audits and recommends improvements. It does not own implementation unless the request explicitly includes implementing the proposed UI changes).
  - For writing or modifying governance validators/fixers (use **governance-audit**).
  - For managing git branches or commit staging (use **git-workflow**).
  - For final pull request merge readiness checklists (use **pr-review**).

## Non-Goals
This skill never:
- Implements production CSS styling or component logic unless explicitly requested.
- Writes backend REST API endpoints.
- Implements static code validators.
- Publishes or manages documentation files.
- Operates git branch commands.
- Runs PR checklists.

## Reuse Policy
Before proposing UI components or layout configurations:
- Check existing shared layout templates and component guides.
- Always reuse existing shared components, shadcn components, Radix primitives, design tokens, and Tailwind utilities before creating anything new.
- Prefer extending existing design patterns.
- Reuse spacing and typography tokens.
- Avoid introducing one-off utility classes.
- Follow existing component composition patterns.
- Do not create custom styling wrappers if shared design tokens are available.

## Skill Relationships
Primary:
- ui-ux

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
