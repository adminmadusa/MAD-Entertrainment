# FIX-001 — CSP Analysis

- **Owner**: Engineering Governance
- **Workstream**: FIX-001
- **Date**: 2026-06-27
- **Status**: COMPLETE

---

## 1. Objective

Determine the **least permissive** Content Security Policy that the application
can operate under without breaking any existing functionality.

---

## 2. Script Source Analysis (`script-src`)

### 2.1 External Scripts (via `loadScriptOnce`)

| Script URL | Purpose | CSP Token |
|---|---|---|
| `https://accounts.google.com/gsi/client` | Google Identity Services | `https://accounts.google.com` |
| `https://checkout.razorpay.com/v1/checkout.js` | Razorpay payment checkout | `https://checkout.razorpay.com` |

Both are loaded lazily only when triggered by user action (sign-in or checkout).

### 2.2 Next.js Framework Scripts

Next.js 15 App Router injects inline `<script>` elements at the page level for:
- Hydration payload serialisation
- Server Action registration
- RSC metadata

These are **not** `<script type="module">` with external `src` attributes — they
are inline executable script content. They require either:

1. `script-src 'unsafe-inline'` — permits all inline scripts
2. A per-request cryptographic nonce (`script-src 'nonce-{value}'`)

The nonce approach is more secure but requires Next.js Middleware to generate
and inject the nonce into both the HTTP response header and the HTML.

**Decision**: Use `'unsafe-inline'` for the initial implementation.
The nonce approach is documented as a future hardening PR.

### 2.3 JSON-LD Data Blocks

The layout uses `dangerouslySetInnerHTML` for `<script type="application/ld+json">`.

Per the **W3C CSP Level 3 specification**, `script-src` applies only to scripts
with a JavaScript MIME type. Scripts with `type="application/ld+json"` are
**data blocks** — they are not executed by the JavaScript engine and are not
subject to `script-src` restrictions.

**Conclusion**: JSON-LD blocks do NOT require `'unsafe-inline'` in `script-src`.
However, `'unsafe-inline'` is still required for Next.js hydration scripts (see 2.2).
The presence of `'unsafe-inline'` is harmless for JSON-LD but not sufficient
justification for its inclusion — the justification is Next.js hydration scripts.

---

## 3. Style Source Analysis (`style-src`)

### 3.1 Tailwind CSS

Tailwind utility classes are applied via HTML `class` attributes — they are not
inline styles. The compiled Tailwind stylesheet is served as an external CSS file.
No `style-src 'unsafe-inline'` requirement from Tailwind.

### 3.2 React Inline Styles (`style={{...}}`)

React's `style={{}}` prop serialises to HTML `style=""` attributes at render time.
These **are** subject to `style-src`. A total of **28 usages** were identified:

| File | Usages | Justification |
|---|---|---|
| `global-error.tsx` | 14 | Renders outside normal layout; cannot use Tailwind classes as global styles are not loaded in the error boundary context |
| `DjDetailClient.tsx` | 3 | CSS perspective transforms via inline style |
| `EventDetailClient.tsx` | 3 | Dynamic z-index and CSS variable injection |
| `FeaturedEventsSection.tsx` | 2 | 3D perspective transforms |
| `page.tsx` (homepage) | 1 | Dynamic gradient via CSS variable |
| `dashboard/page.tsx` | 1 | `safe-area-inset-bottom` env() value |
| `not-found.tsx` | 1 | Gradient radial background |
| `EventStickyCTA.tsx` | 1 | Dynamic width percentage |
| `BookingCard.tsx` | 1 | Rotation transform |
| `UserDropdown.tsx` | 1 | Dynamic positioning |
| `NotFoundDJWidget.tsx` | 1 | Fixed height percentage |

**Conclusion**: `style-src 'unsafe-inline'` is required due to 28 legitimate
inline style usages across the application.

---

## 4. Font Source Analysis (`font-src`)

`next/font/google` downloads Google Fonts at **build time** and self-hosts them.
At runtime, fonts are served from the same origin as Next.js static assets.

**No runtime request to `fonts.googleapis.com` or `fonts.gstatic.com`** is made.

**Conclusion**: `font-src 'self'` is sufficient. No external font domains needed.

---

## 5. Image Source Analysis (`img-src`)

| Source | Purpose |
|---|---|
| `'self'` | Local public assets (favicon, og-image, etc.) |
| `data:` | Next.js `<Image>` generates data URIs for blur placeholders |
| `blob:` | Next.js `<Image>` uses blob URLs for progressive loading |
| `https://res.cloudinary.com` | Event and DJ artwork via custom Cloudinary loader |
| `https://images.unsplash.com` | Supplemental imagery (remote pattern) |

**Conclusion**: All five sources are required.

---

## 6. Connect Source Analysis (`connect-src`)

| Endpoint | Purpose |
|---|---|
| `'self'` | `/api/*` backend proxy (same origin) |
| `https://accounts.google.com` | Google Identity token validation |
| `https://api.razorpay.com` | Razorpay payment API calls |

**Note**: The Next.js backend proxy (`/api/*` → backend server) operates at the
network layer (server-to-server), so the backend URL is never directly referenced
from the browser. `'self'` covers all API calls from the browser.

---

## 7. Frame Source Analysis (`frame-src`)

| Domain | Purpose |
|---|---|
| `https://api.razorpay.com` | Razorpay embeds a payment iframe |
| `https://accounts.google.com` | Google Sign-In renders an iframe |

---

## 8. Final CSP Policy

```
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

---

## 9. Known Relaxations and Future Hardening Path

| Relaxation | Reason | Future Hardening |
|---|---|---|
| `script-src 'unsafe-inline'` | Next.js hydration scripts | Implement nonce injection via Next.js Middleware; migrate JSON-LD scripts to nonce |
| `style-src 'unsafe-inline'` | 28 React inline-style prop usages | Refactor `global-error.tsx` to use CSS classes; audit and replace remaining `style={{}}` usages |

---

## 10. Missing Directives (Intentional)

| Directive | Decision |
|---|---|
| `frame-ancestors` | Covered by `X-Frame-Options: DENY` header |
| `upgrade-insecure-requests` | Covered by HSTS header (SEC-002) |
| `report-uri` / `report-to` | Not configured; add CSP violation reporting endpoint in future |
| `worker-src` | Defaults to `script-src`; service worker is `'self'`-hosted |
