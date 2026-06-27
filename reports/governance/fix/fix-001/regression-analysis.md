# FIX-001 — Regression Analysis

- **Owner**: Engineering Governance
- **Workstream**: FIX-001
- **Date**: 2026-06-27
- **Status**: COMPLETE

---

## 1. Change Surface

| File | Change | Risk Area |
|---|---|---|
| `apps/web/next.config.ts` | Added `Content-Security-Policy` header | Could block resources; zero JS/TS change |
| `apps/web/next.config.ts` | Added `Strict-Transport-Security` header | HTTP-only; no app code change |
| `apps/web/src/app/layout.tsx` | Added skip link `<a>` element | First DOM element added to `<body>` |

Total source changes: **2 files, 3 logical modifications.**

No business logic, API contracts, routing, state management, React Query, auth, or payment flows were touched.

---

## 2. Bundle Size Regression Check

| Route | Baseline First Load JS | Post-Fix First Load JS | Delta |
|---|---|---|---|
| `/` | 165 kB | 165 kB | 0 |
| `/events` | 189 kB | 189 kB | 0 |
| `/events/[slug]` | 158 kB | 158 kB | 0 |
| `/dashboard` | 173 kB | 173 kB | 0 |
| `/login` | 163 kB | 163 kB | 0 |
| `/checkout/[bookingId]` | 176 kB | 176 kB | 0 |
| `/support` | 106 kB | 106 kB | 0 |
| Shared JS | 102 kB | 102 kB | 0 |

**No bundle size regressions.** The skip link `<a>` is a server-rendered HTML
element — it adds negligible bytes to the HTML response but zero bytes to JS bundles.
HTTP headers do not affect bundle size.

---

## 3. CSS Regression Check

The skip link uses only Tailwind utility classes. No new CSS rules were added.
No global style changes were made. The `sr-only` utility class is part of the
existing Tailwind bundle.

**No CSS regressions.**

---

## 4. Hydration Regression Check

The skip link is a static server-rendered `<a>` element with no dynamic props,
no `useEffect`, no client-side state. It will hydrate identically between server
and client renders.

**No hydration mismatch risk.**

---

## 5. CSP Regression Risk Analysis

The CSP is the highest-risk change in this PR. Risk assessment per directive:

| Directive | Regression Risk | Mitigation |
|---|---|---|
| `script-src 'unsafe-inline' accounts.google.com checkout.razorpay.com` | Low — `'unsafe-inline'` allows all current inline scripts; both external domains confirmed from source | Confirmed by source code audit |
| `style-src 'unsafe-inline'` | Low — permits all current inline styles | Confirmed: 28 usages all allowed |
| `font-src 'self'` | Low — fonts are self-hosted | Confirmed: `next/font/google` self-hosts |
| `img-src 'self' data: blob: res.cloudinary.com images.unsplash.com` | Low — all image sources confirmed | Confirmed by `remotePatterns` in `next.config.ts` |
| `connect-src 'self' accounts.google.com api.razorpay.com` | Low — all API origins confirmed | Confirmed by source audit |
| `frame-src api.razorpay.com accounts.google.com` | Low — only Razorpay and Google iframes used | Confirmed by Razorpay checkout flow |
| `object-src 'none'` | None — no plugins used | Safe |
| `base-uri 'self'` | None — no `<base>` tags used | Safe |
| `form-action 'self'` | None — no external form targets | Safe |

**Potential undetected risk**: A third-party script injected at runtime (e.g. via browser extension or future SDK) might conflict with the CSP. This is a security feature, not a regression — blocking unexpected third-party content is the intended behaviour.

---

## 6. HSTS Regression Check

HSTS only activates over HTTPS connections. The development environment uses HTTP,
so HSTS is inert during development. In production (Vercel), HTTPS is enforced at
the CDN level before requests reach the Next.js server.

`includeSubDomains` affects all subdomains of `madentertainment.in`. Any subdomain
served over HTTP would be blocked by browsers after the first HTTPS visit. This is
the intended security behaviour.

**No functional regressions. Intentional security improvement.**

---

## 7. Automated Regression Gate Results

| Gate | Before | After | Status |
|---|---|---|---|
| `pnpm type-check` | 0 errors | 0 errors | ✅ |
| `pnpm lint` | 0 warnings | 0 warnings | ✅ |
| `pnpm test` | All passing | All passing | ✅ |
| `pnpm build` | Clean | Clean | ✅ |
| `pnpm governance:docs` | 0 errors | 0 errors | ✅ |

---

## 8. Rollback Plan

If a CSP violation is detected in production:

1. **Immediate**: Remove the `Content-Security-Policy` header from `next.config.ts`
2. **Deploy**: Vercel redeploy takes < 2 minutes
3. **No data loss**: HTTP headers are stateless; no database or state changes
4. **Debug**: Use `Content-Security-Policy-Report-Only` mode to diagnose violations
   without breaking functionality

If the skip link causes unexpected layout issues:

1. Remove the `<a>` element from `layout.tsx`
2. Redeploy

Both changes are fully reversible with a one-line diff.
