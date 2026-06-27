# FIX-001 — Pre-Implementation Audit

- **Owner**: Engineering Governance
- **Branch**: fix/qa-001-sprint1-blockers
- **Base**: develop @ c70a589
- **Date**: 2026-06-27
- **Status**: COMPLETE

---

## 1. Repository State

| Item | Value |
|---|---|
| Branch | `fix/qa-001-sprint1-blockers` |
| Working Tree | Clean |
| Base Commit | `c70a589` |

---

## 2. Baseline Validation

| Gate | Result |
|---|---|
| `pnpm type-check` | ✅ 0 errors |
| `pnpm lint` | ✅ 0 warnings |
| `pnpm test` | ✅ All passing |
| `pnpm build` | ✅ Both apps |
| `pnpm governance:docs` | ✅ 0 errors (11 pre-existing warnings) |

---

## 3. QA-001 Blocker Re-Verification

### SEC-001 — CSP Header
- `grep "Content-Security-Policy" apps/web/next.config.ts` → **0 matches** ✅ Confirmed still open.

### SEC-002 — HSTS Header
- `grep "Strict-Transport-Security" apps/web/next.config.ts` → **0 matches** ✅ Confirmed still open.

### A11Y-001 — Skip to Main Content
- `grep "skip\|Skip\|#main-content" apps/web/src/app/layout.tsx` → **0 matches** ✅ Confirmed still open.
- `<main id="main-content">` target already exists. ✅

### A11Y-002 — Modal Accessibility

Full re-audit of all `role="dialog"` components:

| Component | `aria-modal` | `aria-labelledby` | Escape | Focus Trap | Focus Restore | Status |
|---|---|---|---|---|---|---|
| `EventBookingFlow` (booking) | ✅ | ✅ `booking-modal-title` | ✅ via `useFocusTrap` | ✅ | ✅ | **Already correct** |
| `EventBookingFlow` (checkout) | ✅ | ✅ `checkout-modal-title` | ✅ via `useFocusTrap` | ✅ | ✅ | **Already correct** |
| `EventOverview` (overview drawer) | ✅ | ✅ `overview-modal-title` | ✅ via `useFocusTrap` | ✅ | ✅ | **Already correct** |
| `LeaveCheckoutModal` | ✅ | ✅ `leave-modal-title` | ✅ via `useFocusTrap` | ✅ | ✅ | **Already correct** |
| `PopupManager` | ✅ | ✅ `popup-title-{id}` | ✅ via `useFocusTrap` | ✅ | ✅ | **Already correct** |
| `MobileNavigation` | ✅ | ✅ `aria-label` | ✅ via `useFocusTrap` | ✅ | ✅ | **Already correct** |
| `TicketSelectionContent` (QR modal) | ✅ | ✅ `qr-modal-title` | ✅ `onKeyDown` + `useFocusTrap` | ✅ | ✅ | **Already correct** |
| `EntryPassGrid` (QR modal) | ✅ | ✅ `qr-modal-title` | ✅ `onKeyDown` | ✅ | ✅ | **Already correct** |

**`useFocusTrap` audit**: The hook (`packages/ui/src/hooks/useFocusTrap.ts`) handles:
- Tab/Shift-Tab focus cycling within container ✅
- `Escape` → calls `onClose` ✅
- Focus restoration to previous element on unmount ✅
- All 8 dialogs pass `useFocusTrap` with an `onClose` callback ✅

**A11Y-002 finding: ALREADY RESOLVED.** QA-001 report was based on code as of the refactor; subsequent implementation completed full modal accessibility. No code changes required for A11Y-002.

### PROD-001 — Cookie Consent

Complete storage audit:

| Storage Type | Usage | Data | Purpose | Consent Required |
|---|---|---|---|---|
| `localStorage` | `USER_TOKEN`, `USER_DATA` | Auth JWT + user profile | Functional/strictly necessary | ❌ No |
| `localStorage` | OTP cooldown timestamps | Rate limiting UX | Functional | ❌ No |
| `localStorage` | Popup `last-shown` timestamps | UX deduplication | Functional | ❌ No |
| `sessionStorage` | Chunk recovery state | Stability | Functional | ❌ No |
| HTTP cookies | None detected | — | — | — |
| IndexedDB | None detected | — | — | — |
| Analytics SDK | None detected | — | — | — |
| Advertising SDK | None detected | — | — | — |
| Tracking SDK | None detected | — | — | — |

Third-party scripts loaded at runtime:
- `https://accounts.google.com/gsi/client` — authentication only, no tracking
- `https://checkout.razorpay.com/v1/checkout.js` — payment only, no tracking

**PROD-001 finding: No consent banner required.** All storage is strictly necessary
functional storage. No consent required under GDPR Article 5(3) or India DPDP Act.

---

## 4. Revised Implementation Scope

| Finding | QA-001 Status | Verified Status | Action |
|---|---|---|---|
| SEC-001 — CSP | Open | **Still open** | Implement |
| SEC-002 — HSTS | Open | **Still open** | Implement |
| A11Y-001 — Skip link | Open | **Still open** | Implement |
| A11Y-002 — Modal ARIA | Open | **Already resolved** | Document only |
| PROD-001 — Cookie consent | Open | **No banner required** | Document only |

---

## 5. CSP Domain Inventory (Full Re-Audit)

Scripts loaded at runtime:
- `https://accounts.google.com/gsi/client` (via `loadScriptOnce`)
- `https://checkout.razorpay.com/v1/checkout.js` (via `loadScriptOnce`)

Images:
- `https://res.cloudinary.com/**`
- `https://images.unsplash.com`
- `data:` URIs (Next.js image optimisation)
- `blob:` URIs (Next.js image optimisation)

Fonts:
- Self-hosted via `next/font/google` — no runtime Google Fonts request ✅

API connections:
- `https://accounts.google.com` (Google Identity token exchange)
- `https://api.razorpay.com` (payment API)
- `/api/*` → same-origin proxy (backend) → `'self'`

Frames:
- `https://api.razorpay.com` (Razorpay checkout iframe)
- `https://accounts.google.com` (Google Sign-In iframe)

Inline scripts:
- JSON-LD `<script type="application/ld+json">` — **NOT subject to `script-src`** per CSP Level 3 spec (non-JS MIME type data blocks are exempted)
- Next.js framework hydration scripts — subject to `script-src`; require `'unsafe-inline'` without nonces

Inline styles:
- 28 `style={{...}}` prop usages — React inline styles become `style=""` attributes in HTML; subject to `style-src`
- `global-error.tsx` uses extensive inline styles (intentional — renders outside normal layout)
- `global-error.tsx` intentionally lives outside the Tailwind/CSS class system

**Conclusion:**
- `script-src 'unsafe-inline'` — required for Next.js hydration scripts
- `style-src 'unsafe-inline'` — required for inline `style={{}}` React props (28 occurrences including global-error)
- `unsafe-inline` for JSON-LD is irrelevant (exempted by spec) but present as a side effect
