# Proposal: Event Checkout Mobile UX Remediation

- **Change ID**: `mobile-ux-event-checkout`
- **Owner**: Repository Governance Owner
- **Status**: Draft

---

## 1. Problem Statement
The Event Ticketing and Checkout flow on mobile viewports (<375px) has several UX and accessibility friction points. These include sub-44px touch targets on critical navigation and action controls, label font sizes below 12px, input zoom-on-focus on iOS devices (which disrupts layout flow), and potential horizontal scroll overflow triggers on long ticket tier names.

---

## 2. Objective
Remediate these issues in a single, focused PR to achieve full WCAG AA compliance and a premium, responsive checkout experience.

---

## 3. Proposed Changes

### Scope (In-Scope)
- **Touch Targets**: Upgrade Back, Close, quantity counter, promo code apply/remove, and modal confirm buttons to a minimum of 44x44px. Increase checkbox hit-box sizes.
- **Form Labels & Contrast**: Upgrade checkbox/subscription label text sizes to `text-xs` (12px).
- **iOS Auto-Zoom Prevention**: Apply `text-base md:text-sm` (16px on mobile, 14px on desktop) to all input elements in `CheckoutForm.tsx` and `PromoCodeForm.tsx`.
- **Horizontal Scroll Prevention**: Truncate/line-clamp long ticket tier names in `TicketSummaryItem.tsx`. Protect the top sticky header against text compression/overlap on 320px devices.

### Out of Scope
- Backend billing, payment verification (Stripe / Razorpay SDKs), or database schemas.
- Modifying checkout session expiration rules or timer logic.
- UI redesigns or new business logic rules.

---

## 4. Key Performance & UX Indicators
- **Touch Target Sizes**: 100% of interactive controls are ≥ 44x44px.
- **iOS Zoom**: Zero layout shift or auto-zoom when tapping inputs on iOS.
- **Horizontal Scroll**: Zero horizontal scrollbars visible on viewports down to 320px width.
- **WCAG AA Conformance**: Contrast ratios ≥ 4.5:1 on labels, legible font scaling.

---

## 5. Verification Plan
- Build, lint, and type-check the repository to ensure zero regressions.
- Verify accessibility (ARIA attributes, roles, and focus visibility).
- Verify mobile responsiveness on viewports from 320px to 1024px using Chrome DevTools or responsive browser checks.
