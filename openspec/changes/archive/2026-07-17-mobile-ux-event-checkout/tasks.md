# Tasks: Event Checkout Mobile UX Remediation

Remediate mobile checkout touch targets, iOS input auto-zoom, and responsive layout constraints (Forensic Audit v1.5.0).

---

## Commit Sequence (Mandatory)
1. `chore(checkout): merge develop and prepare planning artifacts` (Completed)
2. `fix(checkout): prevent horizontal overflow in ticket summary and header`
3. `fix(checkout): improve ticket selection counter and promo code touch targets`
4. `fix(checkout): prevent iOS input auto-zoom and adjust checkbox touch areas`
5. `fix(checkout): improve header buttons and navigation modal touch targets`

---

## Task List

### 1. Preparation & Setup
- [x] Merge `develop` into `fix/mobile-ux-event-checkout` to resolve any outstanding workspace changes.
- [x] Initialize the `mobile-ux-event-checkout` OpenSpec change and planning artifacts.

### 2. Prevent Horizontal Overflows (Commit 2)
- [x] Add max width and truncation to `{formatDisplayName(tierName)}` in `TicketSummaryItem.tsx` (`truncate block max-w-[150px] xs:max-w-[200px] sm:max-w-none`).
- [x] Add `title` attribute to the tier name span in `TicketSummaryItem.tsx`.
- [x] Adjust text sizing and spacing of title (`text-xs md:text-sm`) and timer (`text-[10px] md:text-[11px]`) in the sticky/fixed header of `CheckoutContent.tsx`.

### 3. Selection Counter & Promo Code Targets (Commit 3)
- [x] Upgrade decrement (`-`) and increment (`+`) counter buttons in `TicketSelectionContent.tsx` from `w-10 h-10` to `w-11 h-11` (44px target).
- [x] Upgrade Apply and Remove buttons in `PromoCodeForm.tsx` to `h-11` (or `py-3` height).
- [x] Upgrade promo code text input in `PromoCodeForm.tsx` to `h-11` (or `py-3` height).

### 4. iOS Auto-Zoom & Checkbox Sizing (Commit 4)
- [x] Add `text-base md:text-sm` (16px on mobile, 14px on desktop) to all text input fields in `CheckoutForm.tsx` to prevent iOS zoom-on-focus.
- [x] Standardize label sizes to `text-xs` (12px) for subscriptions in `CheckoutForm.tsx`.
- [x] Style checkbox inputs to be `w-5 h-5` to increase clickable area.

### 5. Header Buttons & Modal Targets (Commit 5)
- [x] Upgrade Back (`←`) and Close (`✕`) buttons in `CheckoutContent.tsx` header to `w-11 h-11` (44px target).
- [x] Upgrade Place Order button in mobile sticky footer of `CheckoutContent.tsx` to `py-3.5` or `min-h-[44px]`.
- [x] Upgrade Stay and Leave buttons in `LeaveCheckoutModal.tsx` to `py-3.5` or `min-h-[44px]`.

### 6. QA Gate & Verification
- [x] Run typescript diagnostics: `pnpm run type-check`.
- [x] Run linting checks: `pnpm run lint`.
- [x] Run local build test: `pnpm run build`.
