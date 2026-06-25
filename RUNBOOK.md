# MAD Entertrainment — Staging & Production Runbook

> **Audience:** Developers and operators deploying or troubleshooting the MAD Entertrainment platform.  
> **Stack:** Next.js 15 (web + admin on Vercel) · Express (server on Render) · MongoDB Atlas · Redis · Cloudinary · Razorpay

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Checklist](#2-environment-checklist)
3. [First-Time Staging Deployment](#3-first-time-staging-deployment)
4. [Payment Sandbox Testing](#4-payment-sandbox-testing)
5. [Database Backup & Restore](#5-database-backup--restore)
6. [Health Check & Monitoring](#6-health-check--monitoring)
7. [Deployment Rollback](#7-deployment-rollback)
8. [Incident Response](#8-incident-response)
9. [QR Validation Dry Run](#9-qr-validation-dry-run)
10. [Real Booking Flow Test Script](#10-real-booking-flow-test-script)

---

## 1. Architecture Overview

> [!NOTE]
> For detailed monorepo package boundaries and code patterns, see the canonical [ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/ARCHITECTURE.md). For infrastructure topology, environments, and CI/CD pipelines, see the canonical [DEPLOYMENT_MAP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/DEPLOYMENT_MAP.md). For public and administrative Express route definitions, Zod schemas, validation specifications, and HTTP error codes, see the canonical [API_CONTRACTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/API_CONTRACTS.md). For historical architectural decisions and their technical rationale, see the canonical [Architecture Decision Records (ADRs)](file:///Users/admin/Desktop/MAD%20Entertrainment/docs/decisions/README.md).

```
Customer Browser
  └─▶ Vercel  (web:   https://mad.esparex.in)
        └─▶ Next.js rewrites /api/* ─▶ Render API

Admin Browser
  └─▶ Vercel  (admin: https://madmin.esparex.in)
        └─▶ Next.js rewrites /api/* ─▶ Render API

Render API    (server: https://apm.esparex.in)
  ├─▶ MongoDB Atlas   (primary datastore)
  ├─▶ Redis           (rate-limiting, session, pub/sub)
  ├─▶ Cloudinary      (image storage)
  ├─▶ Razorpay        (payment gateway)
  └─▶ SMTP            (transactional email)
```

**Key URLs:**

| Service            | URL                               |
| ------------------ | --------------------------------- |
| Web (public)       | https://mad.esparex.in            |
| Admin              | https://madmin.esparex.in         |
| API                | https://apm.esparex.in/api        |
| Health Check       | https://apm.esparex.in/api/health |
| API Docs (Swagger) | https://apm.esparex.in/api/docs   |

---

## 2. Environment Checklist

Complete this checklist before deploying to staging or production.

### Server (Render)

| Variable                  | Required      | Notes                                                     |
| ------------------------- | ------------- | --------------------------------------------------------- |
| `NODE_ENV`                | ✅            | Set to `production`                                       |
| `MONGODB_URI`             | ✅            | Atlas connection string with credentials                  |
| `JWT_SECRET`              | ✅            | Min 32 chars — use `openssl rand -hex 32`                 |
| `JWT_ADMIN_SECRET`        | ✅            | Min 32 chars — different from JWT_SECRET                  |
| `JWT_SESSION_SECRET`      | ✅            | Min 32 chars — required or server will refuse to start    |
| `ALLOWED_ORIGINS`         | ✅            | Comma-separated frontend URLs (no trailing slash)         |
| `REDIS_URL`               | ⚠️            | Optional but strongly recommended for rate limiting       |
| `RAZORPAY_KEY_ID`         | ✅ (payments) | `rzp_test_...` for staging; `rzp_live_...` for production |
| `RAZORPAY_KEY_SECRET`     | ✅ (payments) | Match the key above                                       |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ (payments) | Must match webhook secret in Razorpay dashboard           |
| `CLOUDINARY_CLOUD_NAME`   | ✅ (uploads)  | Required for event image uploads                          |
| `CLOUDINARY_API_KEY`      | ✅ (uploads)  | —                                                         |
| `CLOUDINARY_API_SECRET`   | ✅ (uploads)  | —                                                         |
| `SMTP_HOST`               | ✅ (email)    | Required for booking confirmation emails                  |
| `SMTP_USER`               | ✅ (email)    | —                                                         |
| `SMTP_PASS`               | ✅ (email)    | —                                                         |
| `EMAIL_FROM`              | ✅ (email)    | Sender address shown to customers                         |
| `MOCK_PAYMENTS`           | ✅            | **Must be `false` in staging and production**             |
| `SENTRY_DSN`              | ⚠️            | Optional — enables server error tracking                  |
| `LOG_LEVEL`               | —             | Default: `info`. Set `debug` only for troubleshooting     |

### Web (Vercel)

| Variable                      | Required | Notes                                      |
| ----------------------------- | -------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL`         | ✅       | `https://apm.esparex.in/api`               |
| `NEXT_PUBLIC_SOCKET_URL`      | ✅       | `https://apm.esparex.in`                   |
| `NEXT_PUBLIC_APP_URL`         | ✅       | `https://mad.esparex.in`                   |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ✅       | Must match server's `RAZORPAY_KEY_ID`      |
| `NEXT_PUBLIC_SENTRY_DSN`      | ⚠️       | Optional — enables frontend error tracking |

### Admin (Vercel)

| Variable                    | Required | Notes                                   |
| --------------------------- | -------- | --------------------------------------- |
| `NEXT_PUBLIC_API_URL`       | ✅       | `https://apm.esparex.in/api`            |
| `NEXT_PUBLIC_SOCKET_URL`    | ✅       | `https://apm.esparex.in`                |
| `NEXT_PUBLIC_APP_URL`       | ✅       | `https://madmin.esparex.in`             |
| `NEXT_PUBLIC_CACHE_VERSION` | —        | Default: `prod`                         |
| `NEXT_PUBLIC_SENTRY_DSN`    | ⚠️       | Optional — enables admin error tracking |

---

## 3. First-Time Staging Deployment

### Step 1 — Deploy the server (Render)

1. Push to `live` — Render auto-deploys on push.
2. Verify the build log in the Render dashboard for any missing env var errors.
3. Confirm the health check passes:
   ```bash
   curl https://apm.esparex.in/api/health
   # Expected: {"status":"ok","services":{"mongo":"ok","redis":"ok"},...}
   ```
4. If `status` is `degraded`, check which service is `down` in the response.

### Step 2 — Deploy the web app (Vercel)

1. Connect the `apps/web` directory to a Vercel project.
2. Set all web env vars from the checklist above.
3. Set **Root Directory** to `apps/web` in Vercel project settings.
4. Deploy and verify the home page loads without console errors.

### Step 3 — Deploy the admin app (Vercel)

1. Connect the `apps/admin` directory to a separate Vercel project.
2. Set all admin env vars from the checklist above.
3. Set **Root Directory** to `apps/admin` in Vercel project settings.
4. Deploy and verify login works.

### Step 4 — Verify CORS

If the web or admin app receives CORS errors, confirm that:

- `ALLOWED_ORIGINS` on the server includes the exact Vercel deployment URLs.
- URLs have no trailing slash.
- The `vercel.json` rewrite destination matches the server URL.

### Step 5 — Seed initial data (if needed)

The server auto-seeds the admin user and default categories/tiers on first boot
(`seedAdmin`, `seedCategoriesAndTiers`). Check server logs to confirm seeding ran.

---

## 4. Payment Sandbox Testing

> **Never use live payment keys during testing.**

### Razorpay sandbox setup

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com) and switch to **Test Mode**.
2. Copy the test key (`rzp_test_...`) and secret.
3. Set on the server: `RAZORPAY_KEY_ID=rzp_test_...`, `RAZORPAY_KEY_SECRET=...`
4. Set on the web app: `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...`
5. Confirm `MOCK_PAYMENTS=false` on the server.

### Configure the webhook

1. In Razorpay Dashboard → Webhooks → Add webhook.
2. URL: `https://apm.esparex.in/api/payments/webhook/razorpay`
3. Events: `payment.authorized`, `payment.failed`
4. Copy the webhook secret and set `RAZORPAY_WEBHOOK_SECRET` on the server.

### Test card numbers (Razorpay test mode)

| Card    | Number              | CVV          | Expiry          |
| ------- | ------------------- | ------------ | --------------- |
| Success | 4111 1111 1111 1111 | Any 3 digits | Any future date |
| Failure | 4000 0000 0000 0002 | Any 3 digits | Any future date |

### Payment flow checklist

- [ ] Book an event with quantity 1 — payment intent created
- [ ] Complete payment with test card — booking status becomes `confirmed`
- [ ] Verify QR codes appear on `/my-booking?ref=...`
- [ ] Book an event, cancel payment — booking remains `awaiting_payment`
- [ ] Apply a coupon code — verify discount appears in summary
- [ ] Book with a coupon, complete payment — verify discounted total is charged
- [ ] Attempt to re-use an already-used booking session — verify rejection
- [ ] Attempt duplicate payment on same booking — verify idempotency

---

## 5. Database Backup & Restore

### Automated backups (MongoDB Atlas)

1. Go to **MongoDB Atlas → Your Cluster → Backup**.
2. Confirm **Continuous Backup** or **Scheduled Snapshots** are enabled.
3. Recommended: daily snapshots with 7-day retention for staging; 30-day for production.

### Manual snapshot (emergency)

```bash
mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%Y%m%d-%H%M%S)
```

### Restore from snapshot

```bash
# Atlas point-in-time restore:
# Atlas Dashboard → Backup → Restore → select snapshot → choose target cluster

# Manual restore from dump:
mongorestore --uri="$MONGODB_URI" ./backup-YYYYMMDD-HHMMSS
```

> **Important:** Always test a restore in a separate Atlas cluster before trusting your backup strategy.

### Pre-production index creation

Because `autoIndex: false` is set in production, run this once against a fresh
database before going live to ensure all model indexes exist:

```bash
# Connect to the production MongoDB URI and create indexes manually,
# or add a one-time migration script:
pnpm --filter @mad/server exec tsx scripts/ensure-indexes.ts
```

If `scripts/ensure-indexes.ts` doesn't exist yet, create it to call
`Model.ensureIndexes()` on every Mongoose model.

---

## 6. Health Check & Monitoring

### Health endpoint

```bash
GET https://apm.esparex.in/api/health
```

**Healthy response (HTTP 200):**

```json
{
  "status": "ok",
  "services": { "mongo": "ok", "redis": "ok" },
  "uptime": 3842,
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-05-28T10:00:00.000Z"
}
```

**Degraded response (HTTP 503):**

```json
{
  "status": "degraded",
  "services": { "mongo": "down", "redis": "ok" },
  ...
}
```

### Render health check

Render is configured with `healthCheckPath: /api/health`. Render will:

- Route traffic only to instances returning HTTP 200.
- Restart instances returning HTTP 503 for extended periods.

### Sentry alerts

- **Server:** Set up a Sentry alert for unhandled exceptions (`level: fatal | error`).
- **Web/Admin:** Set up a Sentry alert for any `captureException` event.
- Recommended: Slack or email notification on first occurrence of any new error.

### Recommended uptime monitor

Use [Better Uptime](https://betteruptime.com), [UptimeRobot](https://uptimerobot.com),
or Render's built-in monitoring to ping `/api/health` every 60 seconds.

---

## 7. Deployment Rollback

### Server rollback (Render)

1. Go to **Render Dashboard → mad-server → Deploys**.
2. Find the last known-good deploy.
3. Click **Redeploy** on that version.
4. Monitor `/api/health` until it returns `"status": "ok"`.

### Web/Admin rollback (Vercel)

1. Go to **Vercel Dashboard → Project → Deployments**.
2. Find the last known-good deployment.
3. Click **Promote to Production**.

### Git rollback (emergency)

```bash
# Revert the last commit and push
git revert HEAD --no-edit
git push origin main

# Or reset to a specific commit (use with caution — rewrites history)
git reset --hard <commit-sha>
git push --force-with-lease origin main
```

---

## 8. Incident Response

### Booking failures

1. Check `/api/health` — confirm MongoDB and Redis are up.
2. Check Render logs: `mad-server → Logs` for payment or booking errors.
3. Check Sentry for `AppError` or unhandled rejections in the booking flow.
4. If Razorpay webhook is not firing: check webhook delivery logs in the Razorpay dashboard.

### Payment not confirming

1. Verify `MOCK_PAYMENTS=false` on the server.
2. Check the Razorpay dashboard webhook delivery log — look for failed deliveries.
3. Check server logs for `[PaymentService]` or `[WebhookController]` entries.
4. Manually check the booking status via `/api/admin/bookings/{bookingId}` (see payload specifications in [API_CONTRACTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/API_CONTRACTS.md)).

### QR codes not appearing

1. Confirm booking status is `confirmed` (check `/my-booking?ref=...`).
2. Check server logs for PDF/QR worker errors (workers: `pdf.worker`, `booking.worker`).
3. The outbox worker retries up to `OUTBOX_MAX_ATTEMPTS` times — check for stuck jobs.

### Email not delivered

1. Check SMTP credentials — verify `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are correct.
2. Check server logs for `[EmailWorker]` errors.
3. Check your SMTP provider's bounce/block list.

### Server not starting

1. Check Render build logs for missing env var errors — the most common cause.
2. The most likely culprits: `JWT_SESSION_SECRET` (required, easy to miss), `MONGODB_URI`.
3. Run locally with production env to reproduce:
   ```bash
   NODE_ENV=production pnpm --filter @mad/server dev
   ```

---

## 9. QR Validation Dry Run

Before the first live event, perform this dry run with the venue scanner operator:

- [ ] Generate a test booking with `MOCK_PAYMENTS=false` + Razorpay test card
- [ ] Navigate to `/my-booking?ref=<bookingId>` and confirm QR codes appear
- [ ] Have the venue operator scan the QR code on the admin check-in interface
- [ ] Verify ticket status changes to `checked_in` in the admin dashboard
- [ ] Attempt to scan the same QR code again — verify duplicate rejection message
- [ ] Test scanning in low-light conditions and on a screen with low brightness
- [ ] Test scanning on both Android and iPhone
- [ ] Test on a slow 3G connection — verify QR is usable offline (screenshot)

---

## 10. Real Booking Flow Test Script

Run through this script end-to-end on staging before going live:

```
1. Home page loads without errors
2. Events page lists at least one published event
3. Event detail page shows correct date, time, venue, ticket tiers
4. Click "Book Tickets" → quantity selector appears
5. Select 2 tickets → subtotal updates correctly
6. Proceed to checkout → form renders with expiry timer
7. Fill in guest details (name, email, phone)
8. Apply a valid coupon code → discount reflects in summary
9. Select Razorpay payment
10. Click "Place Order" → Razorpay modal opens
11. Pay with test card → redirect to /my-booking
12. Confirm booking status: "CONFIRMED"
13. Confirm QR codes appear for each ticket
14. Copy booking reference ID → verify it copies to clipboard
15. Open /my-booking on mobile (iOS Safari + Android Chrome)
16. Verify QR codes are large enough to scan on mobile
17. Print / Save button opens the browser print dialog
18. Attempt a second booking with the same coupon → verify single-use rejection
19. Admin: confirm booking appears in the Bookings list
20. Admin: confirm ticket count and total amount are correct
```

---

_Last updated: 2026-05-28 · Maintained in `RUNBOOK.md` at repo root._
