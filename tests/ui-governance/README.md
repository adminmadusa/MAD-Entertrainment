# UI Governance — Playwright Test Layer

| Field | Value |
|-------|-------|
| **Status** | Reserved — Phase 3 (Not Yet Implemented) |
| **Target Command** | `pnpm test:ui-governance` |
| **Planned Phase** | After `scripts/ui-governance-check.ts` (PR-A) has run in advisory mode for 2–3 PR cycles with false-positive rate < 5% |
| **Subordinate To** | [UI_UX_GOVERNANCE.md](../../UI_UX_GOVERNANCE.md) |
| **Related Rules** | VAL-UI-020 → VAL-UI-025, VAL-UX-001 → VAL-UX-003 |

---

## Purpose

This directory is reserved for browser-based UI governance tests that cannot be enforced via static analysis alone. Static analysis (PR-A) validates structure and token usage. This layer validates **runtime rendering** and **visual correctness**.

---

## Full Automation Roadmap

### Phase 1 — Static Analysis (PR-A, `scripts/ui-governance-check.ts`)
> **Status**: Planned (next milestone after documentation stabilizes)
> **Mode**: Advisory (`continue-on-error: true`)

Static file scanning — no browser required:

| Check | Rule | Feasibility |
|-------|------|-------------|
| `<img>` missing `alt` | VAL-UI-020 | ✅ Regex on `.tsx` |
| `<img>` missing `width`/`height` | VAL-UI-021 | ✅ Regex on `.tsx` |
| Hardcoded inline colors | VAL-UI-022 | ✅ Regex on style props |
| `overflow-x: hidden` on root | VAL-UI-023 | ✅ Regex on CSS/className |
| Arbitrary Tailwind spacing | VAL-UI-024 | ✅ Regex on className |
| Duplicate Tailwind utilities | VAL-UI-025 | ✅ className parsing |
| Missing loading state (heuristic) | VAL-UX-001 | ⚠️ Heuristic |
| Missing empty state (heuristic) | VAL-UX-002 | ⚠️ Heuristic |
| Missing error state (heuristic) | VAL-UX-003 | ⚠️ Heuristic |

**Promotion criteria** (Phase 1 → Phase 2):
- False-positive rate < 5%
- No rule changes for 3 consecutive PRs
- Team approval

---

### Phase 2 — AST-Based Analysis (Static, No Browser)
> **Status**: Future
> **Mode**: Initially advisory, promote to blocking after validation

Using TypeScript AST parsing (via `ts-morph` or `@typescript-eslint/parser`) for higher-confidence checks:

| Check | Description |
|-------|-------------|
| Duplicate JSX layouts | Components with >90% structural similarity |
| Token enforcement | Props accepting raw color/spacing values instead of tokens |
| Component ownership | Files missing `@component` JSDoc header |
| Spacing enforcement | CSS-in-JS objects with hardcoded spacing values |

---

### Phase 3 — Playwright Runtime Tests (This Directory)
> **Status**: Reserved
> **Mode**: Initially advisory CI job

Browser-based checks that require a running page:

```
tests/ui-governance/
├── responsive/
│   └── horizontal-overflow.spec.ts     # No page-level horizontal scroll at all breakpoints
│   └── layout-integrity.spec.ts        # No overlapping/clipped elements at each breakpoint
├── accessibility/
│   └── axe-audit.spec.ts               # axe-core automated WCAG AA audit per page
│   └── keyboard-navigation.spec.ts     # Tab order and keyboard operability
│   └── focus-trap.spec.ts              # Modal/drawer focus trapping verified
│   └── focus-return.spec.ts            # Focus returns to trigger on modal close
├── touch-targets/
│   └── touch-target-size.spec.ts       # All interactive elements ≥ 44×44px
├── navigation/
│   └── tab-navigation.spec.ts          # Tab components used for related views
│   └── mobile-nav.spec.ts              # Bottom navigation present on mobile viewport
├── visual/
│   └── breakpoint-screenshots.spec.ts  # Screenshot at 320px, 375px, 768px, 1024px, 1440px
└── interaction/
    └── loading-states.spec.ts          # Skeleton/spinner appears during async operations
    └── empty-states.spec.ts            # Empty state renders when dataset is empty
    └── error-states.spec.ts            # Error state renders and retry button works
```

**CI integration target:**
```yaml
ui-governance:
  name: UI Governance (Playwright)
  runs-on: ubuntu-latest
  needs: [build-lint-test]
  steps:
    - name: Run UI Governance Tests
      run: pnpm test:ui-governance
      continue-on-error: true  # Advisory mode initially
```

**Breakpoints under test**: 320px, 375px, 768px, 1024px, 1440px (as per [UI_UX_GOVERNANCE.md](../../UI_UX_GOVERNANCE.md))

---

### Phase 4 — Visual Regression
> **Status**: Future (after Phase 3 is stable)
> **Tooling candidates**: Percy, Chromatic, or Playwright native snapshots

| Test | Description |
|------|-------------|
| Baseline snapshots | Captured at all 5 required breakpoints per page |
| Change detection | Flags unintended visual changes on PR |
| Component snapshots | Storybook-integrated component-level visual tests |
| Dark mode regression | Verifies dark mode rendering at all breakpoints |

**Promotion criteria** (Phase 3 → Phase 4):
- Phase 3 tests passing with < 2% flakiness for 10 consecutive PRs
- Visual regression tooling selected and approved

---

### Phase 5 — AI-Assisted Governance Review
> **Status**: Future (after Phase 4 is stable)

Automated UI scoring using AI analysis:

| Category | Method | Target Score |
|----------|--------|-------------|
| Mobile Friendliness | Playwright + AI analysis | 100 |
| Accessibility | axe-core + AI commentary | ≥ 90 |
| Navigation Clarity | AI layout analysis | ≥ 90 |
| Responsiveness | Screenshot diff analysis | 100 |
| Visual Consistency | Design token violation count | ≥ 90 |
| Component Reuse | VAL-* registry cross-check | ≥ 85 |
| Performance | CLS + LCP measurement | ≥ 85 |

**Target CI output (Phase 5):**
```
UI Governance Report

Overall Score: 96 / 700
Result: PASS

Rules Checked: 64
Passed: 62  Warnings: 2  Failures: 0

Accessibility:        98
Mobile:              100
Navigation:           94
Responsiveness:      100
Visual Consistency:   96
Component Reuse:      90
Performance:          94
```

---

## Static Check → Playwright Promotion Rules

A static heuristic check should be promoted to a Playwright test when:

| Condition | Action |
|-----------|--------|
| False-positive rate > 10% | Demote from static → Playwright-only |
| Runtime behaviour cannot be inferred from source | Move to Playwright from the start |
| Check requires computed styles | Move to Playwright from the start |

| Static Check | Promotion Trigger |
|-------------|------------------|
| Overflow detection (VAL-UI-023) | If false positive rate > 10% |
| Touch target sizing (VAL-UI-009) | Always Playwright — requires computed layout |
| Screenshot evidence | Always Playwright — requires rendering |
| Loading state detection (VAL-UX-001) | Promote to Playwright if heuristic false-positive rate > 15% |

---

## Test Implementation Standards

When implementing tests in this directory:

- Use Playwright with TypeScript.
- Each spec file must import its governing rule ID in a header comment.
- Tests must run at all 5 required breakpoints unless the test is breakpoint-specific.
- Tests must use `page.setViewportSize()` for breakpoint simulation.
- Each test failure must output the rule ID, description, and remediation link.
- Snapshot tests must use deterministic data fixtures — no live API calls.

---

## Related Documents

- [UI_UX_GOVERNANCE.md](../../UI_UX_GOVERNANCE.md) — authoritative policy (UI-001)
- [UI_UX_GOVERNANCE.md](../../UI_UX_GOVERNANCE.md) — canonical UI/UX standards
- [docs/governance/ENGINE.md](../../docs/governance/ENGINE.md) — governance engine architecture

---

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-07 | Expanded with 5-phase roadmap, full suite structure, promotion criteria, implementation standards |
| 1.0.0 | 2026-07-07 | Reserved directory with initial placeholder |
