# FIX-001 — Security Remediation

- **Owner**: Engineering Governance
- **Workstream**: FIX-001
- **Date**: 2026-06-27
- **Status**: COMPLETE

---

## 1. SEC-001 — Content Security Policy

### Finding
No `Content-Security-Policy` header was configured. The application had no browser-enforced layer of protection against XSS attacks.

### Resolution

Added a `Content-Security-Policy` HTTP header to `apps/web/next.config.ts` in the global `/(.*)`  header rule.

**File changed**: `apps/web/next.config.ts`

**Implementation approach**: A string-concatenated policy is constructed from an explicit array of directives, with each directive documented inline. This approach keeps the policy readable and auditable — no magic strings.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://accounts.google.com https://checkout.razorpay.com;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com;
  connect-src 'self' https://accounts.google.com https://api.razorpay.com;
  frame-src https://api.razorpay.com https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

### Justification for Each Directive

| Directive | Value | Reason |
|---|---|---|
| `default-src` | `'self'` | Restrictive fallback |
| `script-src` | `'self' 'unsafe-inline' accounts.google.com checkout.razorpay.com` | Next.js inline hydration scripts + GSI SDK + Razorpay SDK |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind stylesheet + 28 React `style={{}}` prop usages |
| `font-src` | `'self'` | Fonts self-hosted at build time via `next/font/google` |
| `img-src` | `'self' data: blob: res.cloudinary.com images.unsplash.com` | Local assets + Next.js blur placeholders + CDN images |
| `connect-src` | `'self' accounts.google.com api.razorpay.com` | API proxy (same-origin) + auth/payment APIs |
| `frame-src` | `api.razorpay.com accounts.google.com` | Razorpay and Google Sign-In iframes |
| `object-src` | `'none'` | Disallows all plugin content |
| `base-uri` | `'self'` | Prevents base tag injection |
| `form-action` | `'self'` | Prevents form action hijacking |

### Known Relaxations

`'unsafe-inline'` is present in both `script-src` and `style-src`. This is technically a weaker CSP than a nonce-based policy, but:
1. It eliminates the most common attack vectors (`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`)
2. It is a significant improvement over having no CSP at all
3. The technical justification is documented in `csp-analysis.md`
4. A nonce-based hardening path is defined as a future PR

---

## 2. SEC-002 — Strict Transport Security (HSTS)

### Finding
No `Strict-Transport-Security` header was configured.

### Resolution

Added `Strict-Transport-Security` to the same global header rule.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

| Directive | Value | Reason |
|---|---|---|
| `max-age` | `31536000` (1 year) | Standard HSTS duration; forces HTTPS for 1 year after first visit |
| `includeSubDomains` | Present | Extends HTTPS enforcement to all subdomains |
| `preload` | **Absent** | Intentionally omitted — HSTS preload list submission is irreversible and requires explicit opt-in decision |

### HSTS Preload Decision

The `preload` directive was excluded because:
- Submitting a domain to the HSTS preload list is a permanent action that cannot be reversed for 6–12 months
- It requires all subdomains to support HTTPS
- No explicit decision to preload has been made

The `preload` directive can be added to the header value and the domain submitted at a future date when ready.

---

## 3. Validation

| Gate | Before | After |
|---|---|---|
| `pnpm type-check` | ✅ 0 errors | ✅ 0 errors |
| `pnpm lint` | ✅ 0 warnings | ✅ 0 warnings |
| `pnpm build` | ✅ Clean | ✅ Clean |
| Bundle sizes | Baseline | Identical — no regressions |

---

## 4. Verification Steps

To verify these headers are active after deployment:

```bash
curl -I https://madentertainment.in/ | grep -E "content-security-policy|strict-transport-security"
```

Expected response:
```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
strict-transport-security: max-age=31536000; includeSubDomains
```

---

## 5. Future Hardening (Documented for Backlog)

| Action | Description | Priority |
|---|---|---|
| Nonce-based CSP | Implement Next.js Middleware to inject per-request nonces; remove `unsafe-inline` from `script-src` | Medium |
| Remove `style-src 'unsafe-inline'` | Refactor `global-error.tsx` and remaining `style={{}}` usages to use CSS classes | Low |
| CSP violation reporting | Add `report-to` endpoint to capture real-world CSP violations | Low |
| HSTS preload | Evaluate domain readiness and submit to preload list | Future |
