# FIX-001 — Accessibility Remediation

- **Owner**: Engineering Governance
- **Workstream**: FIX-001
- **Date**: 2026-06-27
- **Standard**: WCAG 2.2 Level A / AA
- **Status**: COMPLETE

---

## 1. A11Y-001 — Skip to Main Content Link

### Finding
No skip navigation link was present. Keyboard users were required to tab through the entire navigation bar on every page load. This violated WCAG 2.4.1 (Bypass Blocks, Level A).

### Resolution

Added a visually hidden skip link as the **first focusable element** in the document.

**File changed**: `apps/web/src/app/layout.tsx`

**Implementation**:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
             focus:z-[200] focus:px-4 focus:py-2 focus:rounded-xl
             focus:bg-accent-purple focus:text-white focus:font-bold
             focus:text-sm focus:shadow-glow focus:outline-none"
>
  Skip to main content
</a>
```

**Placement**: Immediately inside `<body>`, before `<script>` JSON-LD tags. This makes it the first element in tab order.

### Design Decisions

| Decision | Rationale |
|---|---|
| `sr-only` when unfocused | No visual impact on the layout; follows standard skip link UX pattern |
| `focus:not-sr-only` | Makes link visible when focused via keyboard |
| `focus:fixed` | Prevents layout shift by removing from document flow when visible |
| `focus:z-[200]` | Appears above the fixed navbar (z-40) |
| `focus:bg-accent-purple` | Matches MAD Entertrainment brand palette |
| Target `#main-content` | The `<main id="main-content">` landmark already existed in the layout |

### WCAG Compliance

| Criterion | Status |
|---|---|
| 2.4.1 Bypass Blocks (Level A) | ✅ Resolved |
| 2.4.3 Focus Order | ✅ First in tab order |
| 1.4.1 Use of Color | ✅ White text on purple — high contrast |
| 2.4.7 Focus Visible | ✅ Clearly visible on focus |

### Cross-Browser Compatibility

| Browser | Expected Behaviour |
|---|---|
| Chrome | ✅ `sr-only` / `focus:not-sr-only` pattern supported |
| Safari | ✅ Supported |
| Firefox | ✅ Supported |
| Mobile Safari | ✅ Skip link accessible via external keyboard |
| Mobile Chrome | ✅ Accessible via external keyboard |

---

## 2. A11Y-002 — Modal Accessibility

### Finding
QA-001 identified two modals (`EventBookingFlow`, `EventOverview`) as potentially missing `aria-modal` and Escape key support.

### Re-Audit Result

A full re-audit of all 8 `role="dialog"` components was performed. All were found to be fully compliant:

| Component | Finding | Status |
|---|---|---|
| `EventBookingFlow` (booking modal) | Already had `aria-modal`, `aria-labelledby`, `useFocusTrap` | ✅ No change |
| `EventBookingFlow` (checkout modal) | Already had `aria-modal`, `aria-labelledby`, `useFocusTrap` | ✅ No change |
| `EventOverview` | Already had `aria-modal`, `aria-labelledby`, `useFocusTrap` | ✅ No change |
| `LeaveCheckoutModal` | Already had `aria-modal`, `aria-labelledby`, `useFocusTrap` | ✅ No change |
| `PopupManager` | Already had `aria-modal`, `aria-labelledby`, `useFocusTrap` | ✅ No change |
| `MobileNavigation` | Already had `aria-modal`, `aria-label`, `useFocusTrap` | ✅ No change |
| `TicketSelectionContent` | Already had `aria-modal`, `aria-labelledby`, Escape handler | ✅ No change |
| `EntryPassGrid` | Already had `aria-modal`, `aria-labelledby`, Escape handler | ✅ No change |

The `useFocusTrap` hook (`packages/ui/src/hooks/useFocusTrap.ts`) handles Tab cycling, Escape key closure, and focus restoration for all 6 dialogs that use it.

**A11Y-002: No code changes required. Finding closed as already resolved.**

---

## 3. Validation

| Gate | Before | After |
|---|---|---|
| `pnpm type-check` | ✅ 0 errors | ✅ 0 errors |
| `pnpm lint` | ✅ 0 warnings | ✅ 0 warnings |
| `pnpm build` | ✅ Clean | ✅ Clean |
| Bundle sizes | Baseline | Identical — no regressions |
| WCAG 2.4.1 | ❌ Violated | ✅ Resolved |

---

## 4. Remaining Accessibility Backlog (From QA-001)

Not in FIX-001 scope. Tracked for future PRs:

| Finding | Description |
|---|---|
| A11Y-003 | Event card images have empty `alt` attributes |
| A11Y-004 | Support search input missing `aria-label` |
| A11Y-005 | Admin app reduced accessibility coverage |
