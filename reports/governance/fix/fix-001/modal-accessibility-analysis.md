# FIX-001 — Modal Accessibility Analysis

- **Owner**: Engineering Governance
- **Workstream**: FIX-001
- **Date**: 2026-06-27
- **Status**: COMPLETE

---

## 1. Objective

Verify every `role="dialog"` component against WCAG 4.1.2 (Name, Role, Value)
and WCAG 2.1.2 (No Keyboard Trap) requirements:

- `role="dialog"` present
- `aria-modal="true"` present
- `aria-labelledby` or `aria-label` present
- Focus trap active when open
- Escape key closes dialog
- Focus restores to triggering element after close

---

## 2. `useFocusTrap` Hook Verification

All dialogs use `useFocusTrap` from `@mad/ui`. Full hook audit:

**Source**: `packages/ui/src/hooks/useFocusTrap.ts`

| Capability | Implementation | Status |
|---|---|---|
| Tab focus cycling | Wraps focus within container using `querySelectorAll` | ✅ |
| Shift+Tab reverse cycling | Handled with `e.shiftKey` branch | ✅ |
| Initial focus | Auto-focuses first focusable element on activation | ✅ |
| Escape → close | `e.key === 'Escape' && onCloseRef.current()` | ✅ |
| Focus restoration | `previousActiveElementRef` + `setTimeout(...focus(), 0)` | ✅ |
| `onClose` ref pattern | Uses `useRef` for stable callback reference | ✅ |

The hook satisfies all WCAG dialog keyboard interaction requirements.

---

## 3. Dialog-by-Dialog Verification

### 3.1 EventBookingFlow — Booking Modal

**Source**: `apps/web/src/app/events/[slug]/components/EventBookingFlow.tsx:108`

| Check | Value | Status |
|---|---|---|
| `role` | `"dialog"` | ✅ |
| `aria-modal` | `"true"` | ✅ |
| `aria-labelledby` | `"booking-modal-title"` → `<h3 id="booking-modal-title">` | ✅ |
| Focus trap | `useFocusTrap({ isActive: isBookingModalOpen, onClose: () => setIsBookingModalOpen(false) })` | ✅ |
| Escape | Via `useFocusTrap` | ✅ |
| Focus restoration | Via `useFocusTrap` (`shouldRestoreFocus: true` default) | ✅ |
| Close button | `aria-label="Close ticket selection modal"`, `focus:ring-2` | ✅ |

**Verdict: PASS — No changes required.**

### 3.2 EventBookingFlow — Checkout Modal

**Source**: `apps/web/src/app/events/[slug]/components/EventBookingFlow.tsx:244`

| Check | Value | Status |
|---|---|---|
| `role` | `"dialog"` | ✅ |
| `aria-modal` | `"true"` | ✅ |
| `aria-labelledby` | `"checkout-modal-title"` | ✅ |
| Focus trap | `useFocusTrap({ isActive: isCheckoutModalOpen, onClose: ... })` | ✅ |
| Escape | Via `useFocusTrap` | ✅ |
| Focus restoration | Via `useFocusTrap` | ✅ |

**Verdict: PASS — No changes required.**

### 3.3 EventOverview — Description Drawer

**Source**: `apps/web/src/app/events/[slug]/components/EventOverview.tsx:79`

| Check | Value | Status |
|---|---|---|
| `role` | `"dialog"` | ✅ |
| `aria-modal` | `"true"` | ✅ |
| `aria-labelledby` | `"overview-modal-title"` → `<h3 id="overview-modal-title">` | ✅ |
| Focus trap | `useFocusTrap({ isActive: isOverviewOpen, onClose: () => setIsOverviewOpen(false) })` | ✅ |
| Escape | Via `useFocusTrap` | ✅ |
| Focus restoration | Via `useFocusTrap` | ✅ |

**Verdict: PASS — No changes required.**

### 3.4 LeaveCheckoutModal

**Source**: `apps/web/src/components/booking/checkout/LeaveCheckoutModal.tsx:25`

| Check | Value | Status |
|---|---|---|
| `role` | `"dialog"` | ✅ |
| `aria-modal` | `"true"` | ✅ |
| `aria-labelledby` | `"leave-modal-title"` | ✅ |
| Focus trap | `useFocusTrap({ isActive: true, onClose: onCancel })` | ✅ |
| Escape | Via `useFocusTrap` → calls `onCancel` | ✅ |
| Focus restoration | Via `useFocusTrap` | ✅ |

**Verdict: PASS — No changes required.**

### 3.5 PopupManager

**Source**: `apps/web/src/components/common/PopupManager.tsx:51`

| Check | Value | Status |
|---|---|---|
| `role` | `"dialog"` | ✅ |
| `aria-modal` | `"true"` | ✅ |
| `aria-labelledby` | `popup-title-{popup._id}` | ✅ |
| Focus trap | `useFocusTrap({ isActive: !!popup, onClose: handleDismiss })` | ✅ |
| Escape | Via `useFocusTrap` → calls `handleDismiss` | ✅ |
| Focus restoration | Via `useFocusTrap` | ✅ |

**Verdict: PASS — No changes required.**

### 3.6 MobileNavigation

**Source**: `apps/web/src/components/layout/MobileNavigation.tsx:108`

| Check | Value | Status |
|---|---|---|
| `role` | `"dialog"` | ✅ |
| `aria-modal` | `"true"` | ✅ |
| Label | `aria-label="Navigation Menu"` | ✅ |
| Focus trap | `useFocusTrap({ isActive: isOpen, onClose })` | ✅ |
| Escape | Via `useFocusTrap` → calls `onClose` | ✅ |
| Focus restoration | Via `useFocusTrap` | ✅ |

**Verdict: PASS — No changes required.**

### 3.7 TicketSelectionContent — QR Modal

**Source**: `apps/web/src/components/booking/TicketSelectionContent.tsx:296`

| Check | Value | Status |
|---|---|---|
| `role` | `"dialog"` | ✅ |
| `aria-modal` | `"true"` | ✅ |
| `aria-labelledby` | `"qr-modal-title"` | ✅ |
| Focus trap | `useFocusTrap` active | ✅ |
| Escape | `onKeyDown`: `e.key === 'Escape' \|\| e.key === 'Enter'` → close | ✅ |
| Focus restoration | Via `useFocusTrap` | ✅ |

**Verdict: PASS — No changes required.**

### 3.8 EntryPassGrid — QR Modal

**Source**: `apps/web/src/components/booking/shared/EntryPassGrid.tsx:234`

| Check | Value | Status |
|---|---|---|
| `role` | `"dialog"` | ✅ |
| `aria-modal` | `"true"` | ✅ |
| `aria-labelledby` | `"qr-modal-title"` | ✅ |
| Focus trap | `useFocusTrap` active | ✅ |
| Escape | `onKeyDown`: `if (e.key === 'Escape') setExpandedPass(null)` | ✅ |
| Focus restoration | Via `useFocusTrap` | ✅ |

**Verdict: PASS — No changes required.**

---

## 4. Summary

| Component | QA-001 Status | Verified Status | Changes Made |
|---|---|---|---|
| EventBookingFlow (booking modal) | Open | Already correct | None |
| EventBookingFlow (checkout modal) | Open | Already correct | None |
| EventOverview | Open | Already correct | None |
| LeaveCheckoutModal | — | Already correct | None |
| PopupManager | — | Already correct | None |
| MobileNavigation | — | Already correct | None |
| TicketSelectionContent | — | Already correct | None |
| EntryPassGrid | — | Already correct | None |

**A11Y-002 finding: FULLY RESOLVED** — all dialogs meet WCAG 4.1.2 requirements.
The `useFocusTrap` hook implements complete WCAG dialog keyboard interaction.
No code changes were required.

The QA-001 report was based on a code snapshot taken before the refactor
workstreams completed the full modal accessibility implementation.
