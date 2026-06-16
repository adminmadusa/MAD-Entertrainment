# MAD Entertrainment — Deployment Map

> **Generated:** 2026-06-16  
> **Source:** Audit of `vercel.json`, `render.yaml`, `RUNBOOK.md`, `.github/workflows/ci.yml`, git branch state  
> **Status at generation:** `develop = live = e152810` (F-16 release)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Customer Browser                                                │
│    └─▶ Vercel (web)           https://mad.esparex.in            │
│          └─▶ /api/* rewrite ──▶ https://apm.esparex.in/api/*   │
│                                                                  │
│  Admin Browser                                                   │
│    └─▶ Vercel (admin)         https://madmin.esparex.in         │
│          └─▶ /api/* rewrite ──▶ https://apm.esparex.in/api/*   │
│                                                                  │
│  Render API                   https://apm.esparex.in            │
│    ├─▶ MongoDB Atlas          Primary datastore                  │
│    ├─▶ Redis                  Rate-limiting · sessions · queues │
│    ├─▶ Cloudinary             Event image storage                │
│    ├─▶ Razorpay               Payment gateway                   │
│    ├─▶ BullMQ (Redis-backed)  booking-queue · pdf-queue         │
│    └─▶ SMTP (ZeptoMail)       Transactional email               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Registry

| Service | Platform | URL | Trigger |
|---|---|---|---|
| Public web app | Vercel | https://mad.esparex.in | Push to `live` |
| Admin dashboard | Vercel | https://madmin.esparex.in | Push to `live` |
| API server | Render | https://apm.esparex.in | Push to `live` |
| Health check | Render | https://apm.esparex.in/api/health | Render auto-ping |
| API docs (Swagger) | Render | https://apm.esparex.in/api/docs | — |
| MongoDB | Atlas | (private URI) | Managed |
| Redis | Managed Redis | (private URL) | Managed |
| Image CDN | Cloudinary | https://res.cloudinary.com | On upload |

---

## Branch → Deployment Map

| Branch | Maps to | Platform | Auto-deploy |
|---|---|---|---|
| `live` | Production | Vercel (web + admin) + Render (server) | ✅ Yes |
| `develop` | Staging (if configured) | — | Manual |
| `main` | Legacy/archive | — | No |
| Feature branches | Preview deployments | Vercel (PR previews only) | ✅ On PR |

### Current Branch State (as of audit)

| Branch | Commit | Status |
|---|---|---|
| `live` | `e152810` | ✅ In sync with develop |
| `develop` | `e152810` | ✅ In sync with live |
| `origin/live` | `e152810` | ✅ In sync with local |
| `origin/develop` | `e152810` | ✅ In sync with local |

---

## CI Pipeline

**File:** `.github/workflows/ci.yml`  
**Trigger:** Push or PR to `develop`, `live`, `main`, `master`

| Job | Steps | Gate |
|---|---|---|
| `build-lint-test` | Checkout → pnpm install → Lint → Type check → CI governance check → Build → Audit → Tests | ✅ Required |
| `secret-scanning` | TruffleHog OSS (diff-based) | ✅ Required on PR/push |
| `dependency-audit` | `scripts/dependency_audit.ts` | ✅ Required |

---

## Environment Variables

### Server (Render — `mad-server`)

| Variable | Required | Enforced by | Notes |
|---|---|---|---|
| `NODE_ENV` | ✅ | `render.yaml` | Set to `production` |
| `MONGODB_URI` | ✅ | Zod schema (`z.string().url()`) | Must be Atlas URI |
| `JWT_SECRET` | ✅ | Zod schema (`z.string().min(32)`) | — |
| `JWT_ADMIN_SECRET` | ✅ | Zod schema (`z.string().min(32)`) | — |
| `JWT_SESSION_SECRET` | ✅ | Zod schema (`z.string().min(32)`) | — |
| `ALLOWED_ORIGINS` | ✅ | CORS middleware | No trailing slash |
| `REDIS_URL` | ⚠️ Optional | — | Recommended; graceful degradation if absent |
| `RAZORPAY_KEY_ID` | ✅ (payments) | Dashboard only | `rzp_live_...` in production |
| `RAZORPAY_KEY_SECRET` | ✅ (payments) | Dashboard only | — |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ (payments) | **`validateEnv()` — F-16** | Server refuses to start if absent when KEY_ID set |
| `STRIPE_SECRET_KEY` | ⚠️ Optional | Dashboard only | Only if Stripe enabled |
| `STRIPE_PUBLISHABLE_KEY` | ⚠️ Optional | Dashboard only | — |
| `STRIPE_WEBHOOK_SECRET` | ✅ (if Stripe) | **`validateEnv()` — F-16** | Server refuses to start if absent when SECRET_KEY set |
| `CLOUDINARY_CLOUD_NAME` | ✅ (uploads) | Dashboard only | — |
| `CLOUDINARY_API_KEY` | ✅ (uploads) | Dashboard only | — |
| `CLOUDINARY_API_SECRET` | ✅ (uploads) | Dashboard only | — |
| `SMTP_HOST` | ✅ (email) | Dashboard only | ZeptoMail |
| `SMTP_PORT` | ✅ (email) | Dashboard only | — |
| `SMTP_USER` | ✅ (email) | Dashboard only | — |
| `SMTP_PASS` | ✅ (email) | Dashboard only | — |
| `MAIL_FROM` | ✅ (email) | Dashboard only | — |
| `DLQ_ENCRYPTION_KEY` | ✅ | `validateEnv()` startup assert | Default key blocked in production |
| `MOCK_PAYMENTS` | ✅ | `validateEnv()` startup assert | `true` blocked in production |
| `SENTRY_DSN` | ⚠️ Optional | Dashboard only | Enables error tracking |
| `LOG_LEVEL` | — | Dashboard only | Default: `info` |

### Web App (Vercel — `apps/web`)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://apm.esparex.in/api` |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | `https://apm.esparex.in` |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://mad.esparex.in` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ✅ | Must match server `RAZORPAY_KEY_ID` |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ | Optional — frontend error tracking |

### Admin App (Vercel — `apps/admin`)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://apm.esparex.in/api` |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | `https://apm.esparex.in` |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://madmin.esparex.in` |
| `NEXT_PUBLIC_CACHE_VERSION` | — | Default: `prod` |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ | Optional |

---

## Render Build Configuration

**Source:** `render.yaml`

```yaml
type: web
name: mad-server
env: node
rootDir: .
buildCommand: >
  pnpm install --frozen-lockfile &&
  pnpm --filter @mad/server... run clean &&
  pnpm --filter @mad/server... build
startCommand: node apps/server/dist/apps/server/src/server.js
```

**Health check path:** `/api/health` (inferred from RUNBOOK; not declared in `render.yaml`)  
**Known gap:** `render.yaml` does not declare env var stubs — all secrets are dashboard-only.

---

## Vercel Build Configuration

**Source:** `vercel.json` + `apps/web/next.config.ts` + `apps/admin/next.config.ts`

### Web (`apps/web`)
- **Root Directory:** `apps/web` (set in Vercel project settings)
- **Build Command:** `pnpm build` (Next.js default)
- **API Proxy Rewrite:** `/api/:path*` → `https://apm.esparex.in/api/:path*`
- **Security headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **Missing headers:** `Content-Security-Policy`, `Strict-Transport-Security` _(open finding F-01)_

### Admin (`apps/admin`)
- **Root Directory:** `apps/admin` (set in Vercel project settings)
- **API Proxy Rewrite:** `/api/:path*` → `${NEXT_PUBLIC_API_URL}/:path*` (env-var interpolated)
- **Security headers:** Same set as web app
- **Missing headers:** Same as web app

---

## Rollback Procedures

### Server (Render)
1. Render Dashboard → `mad-server` → Deploys
2. Find last known-good deploy
3. Click **Redeploy**
4. Monitor: `curl https://apm.esparex.in/api/health`

### Web / Admin (Vercel)
1. Vercel Dashboard → Project → Deployments
2. Find last known-good deployment
3. Click **Promote to Production**

### F-16 Specific Rollback
The F-16 commit (`e152810`) only modifies `apps/server/src/config/env.ts`.  
Rollback commit is documented in the PR body as: `git revert a48633e`

---

## Known Open Findings (from Audit Report)

| ID | Area | Status |
|---|---|---|
| F-16 | Webhook secret production guards | ✅ Resolved in `e152810` |
| F-01 | CSP + HSTS missing in `next.config.ts` | 🔴 Open |
| F-09/F-18 | Admin socket skips `isActive`/`passwordVersion` DB check | 🔴 Open |
| F-13 | `render.yaml` env var stubs missing | 🟡 Open |
| GOV-001 | No ESLint on `apps/server` | 🟡 Open |

---

*Generated by Release Verification Audit · 2026-06-16 · Audit only — no code changes made*
