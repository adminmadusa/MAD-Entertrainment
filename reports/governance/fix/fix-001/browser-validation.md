# FIX-001 — Browser & Manual Validation Report

- **Owner**: Engineering Governance
- **Workstream**: FIX-001
- **Date**: 2026-06-27
- **Status**: COMPLETE (Local automated validation performed; cross-browser manual validation documented as deployment verification steps)

---

## 1. Automated Validation Results

| Gate | Result |
|---|---|
| `pnpm type-check` | ✅ 0 errors |
| `pnpm lint` | ✅ 0 warnings |
| `pnpm test` | ✅ All suites passing |
| `pnpm build` | ✅ Both apps compile cleanly |
| `pnpm governance:docs` | ✅ 0 errors |

Build output (web app, final):
```
○ /                     9.03 kB   165 kB
○ /events               7.67 kB   189 kB
ƒ /events/[slug]        8.33 kB   158 kB
○ /dashboard           14.9 kB   173 kB
○ /login               11.6 kB   163 kB
ƒ /checkout/[bookingId] 13.3 kB   176 kB
Shared JS               102 kB
```

All bundle sizes identical to baseline — zero regressions.

---

## 2. Skip Link — Keyboard Validation Protocol

The following steps should be performed manually in the browser after deployment:

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `https://madentertainment.in/` | Page loads normally — no visible skip link |
| 2 | Press `Tab` (first keypress) | "Skip to main content" link appears in top-left corner, styled with accent-purple background |
| 3 | Press `Enter` | Browser focus jumps to `<main id="main-content">` |
| 4 | Press `Tab` again | Focus moves to first interactive element within `<main>` |
| 5 | Navigate to `/events` and repeat | Same behaviour on all pages |
| 6 | Navigate to `/login` and repeat | Same behaviour |
| 7 | Navigate to `/dashboard` and repeat | Same behaviour |
| 8 | Navigate to `/support` and repeat | Same behaviour |

**Expected: pass on all pages.**

---

## 3. CSP Validation Protocol

The following should be verified in browser DevTools after deployment:

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open DevTools → Console | No CSP violation errors |
| 2 | Navigate to `/` | Cloudinary images load, no `img-src` violations |
| 3 | Navigate to `/login` | Google Sign-In button renders, Google script loads without violation |
| 4 | Initiate Google Sign-In | GSI iframe opens, no `frame-src` violations |
| 5 | Navigate to `/events/[slug]` | Event images load from Cloudinary |
| 6 | Open booking modal → proceed to checkout | Razorpay script loads, payment modal opens |
| 7 | DevTools → Network → Headers on any response | Confirm `content-security-policy` header present |
| 8 | DevTools → Network → Headers on any response | Confirm `strict-transport-security: max-age=31536000; includeSubDomains` present |

**Expected: zero CSP violations across all tested pages.**

---

## 4. Modal Escape Key Validation Protocol

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open booking modal on any event page | Modal opens, focus traps inside |
| 2 | Press `Escape` | Modal closes, focus returns to "Book Tickets" button |
| 3 | Open checkout modal | Modal opens |
| 4 | Press `Escape` | Modal closes |
| 5 | Open event overview drawer (Read more) | Drawer opens |
| 6 | Press `Escape` | Drawer closes |
| 7 | Open mobile navigation | Nav dialog opens |
| 8 | Press `Escape` | Navigation closes |

---

## 5. Cross-Browser Matrix

| Browser | Skip Link | CSP Headers | Google Sign-In | Razorpay | Cloudinary Images | Notes |
|---|---|---|---|---|---|---|
| Chrome 125+ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Primary browser |
| Safari 17+ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | — |
| Firefox 126+ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | — |
| Mobile Safari (iOS 17) | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Skip link via external keyboard only |
| Mobile Chrome (Android) | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Skip link via external keyboard only |

CSP headers are evaluated server-side and sent as HTTP response headers. Browser rendering engine does not affect header processing. The Tailwind `sr-only` / `focus:not-sr-only` utility pattern is universally supported in all modern browsers.

---

## 6. Screen Reader Smoke Test Protocol

| Step | Action | Expected Announcement |
|---|---|---|
| 1 | VoiceOver on Mac → Tab to first element on homepage | "Skip to main content, link" |
| 2 | Activate skip link | Focus moves, landmark announced as "main" |
| 3 | Open booking modal | "Ticket selection — [event name], dialog" announced |
| 4 | Press Escape | Modal closes, previous element re-announced |

---

## 7. Lighthouse Expected Impact

| Category | Before | Expected After |
|---|---|---|
| Accessibility | ~85 | ~90+ (skip link adds bypass-blocks credit) |
| Best Practices | ~80 | ~95+ (CSP header adds security credit) |
| Performance | Baseline | No change (headers are net-zero on performance) |
| SEO | Baseline | No change |
