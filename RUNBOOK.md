# MAD Entertrainment — Staging & Production Runbook

> **Audience:** Developers and operators deploying or troubleshooting the MAD Entertrainment platform.
> **Stack:** Next.js 15 (web + admin on Vercel) · Express (server on Render) · MongoDB Atlas · Redis · Cloudinary · Razorpay

- **Owner**: Platform/Deployment Owner
- **Status**: Active
- **Version**: 1.0
- **Review Cycle**: Ongoing
- **Last Updated**: 2026-07-03
- **Related Documents:**
  - [README.md](README.md)
  - [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md)
  - [ARCHITECTURE.md](ARCHITECTURE.md)
  - [DEPLOYMENT_MAP.md](DEPLOYMENT_MAP.md)
  - [API_CONTRACTS.md](API_CONTRACTS.md)
  - [AGENTS.MD](AGENTS.MD)

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
11. [Event Memories — Publishing Workflow](#11-event-memories--publishing-workflow)

---

## 1. Architecture Overview

> [!NOTE]
> For detailed monorepo package boundaries and code patterns, see the canonical [ARCHITECTURE.md](ARCHITECTURE.md). For infrastructure topology, environments, and CI/CD pipelines, see the canonical [DEPLOYMENT_MAP.md](DEPLOYMENT_MAP.md). For public and administrative Express route definitions, Zod schemas, validation specifications, and HTTP error codes, see the canonical [API_CONTRACTS.md](API_CONTRACTS.md). For historical architectural decisions and their technical rationale, see the canonical [Architecture Decision Records (ADRs)](docs/decisions/README.md). For repository branching, PR review, and verification policies, see the canonical [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md). For chronological release history and version-specific operational changes, see the [CHANGELOG.md](CHANGELOG.md).

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
4. Manually check the booking status via `/api/admin/bookings/{bookingId}` (see payload specifications in [API_CONTRACTS.md](API_CONTRACTS.md)).

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

_Last updated: 2026-07-03 · Maintained in `RUNBOOK.md` at repo root._

---

## 11. Event Memories — Publishing Workflow

> Audience: Platform operators and admin staff publishing post-event content.

### Prerequisites

#### Required Environment Variable

| Variable | Required | Notes |
| :--- | :--- | :--- |
| `JWT_ADMIN_SECRET` | ✅ | Min 32 chars (same secret already required for admin auth). Signs Event Memories preview tokens. TTL is 15 minutes. |

`JWT_ADMIN_SECRET` is already present in the Render environment. No new environment variable is required for Event Memories to function.

---

### Step 1 — Verify the Event is in COMPLETED Status

Event Memories are intended for events with status `COMPLETED`. Confirm the event has been transitioned to `COMPLETED` via the admin event edit page before proceeding.

```bash
# Health check to confirm the backend is reachable
curl https://apm.esparex.in/api/health
# Expected: {"status":"ok", ...}
```

---

### Step 2 — Open the Event Edit Page

1. Log in to the admin panel at `https://madmin.esparex.in`.
2. Navigate to **Events** → Select the completed event → Click **Edit**.
3. Scroll to the **Event Memories** card (`EventMemoriesCard`).

---

### Step 3 — Compose Memories Content

Complete the following fields in the Event Memories card:

| Field | Max Length | Notes |
| :--- | :--- | :--- |
| Heading | 200 chars | Optional. Editorial headline shown above the gallery. |
| Thank You Message | 2000 chars | Optional. Message displayed to attendees. |
| Highlights | — | Optional. Bullet-point list of event highlights. |
| Gallery | Up to 50 images | Upload via Cloudinary. Each image has a drag-and-drop `order` field. |

When saving in this step, leave `publicationState` as `DRAFT`.

---

### Step 4 — Preview Memories (Optional)

Before publishing, use the preview workflow to inspect how memories will look on the public event page:

1. In the Event Memories card, click **Preview**.
2. The admin panel calls `POST /api/admin/events/:id/preview-token` and receives a token valid for **15 minutes**.
3. The admin panel opens the public event detail page with the preview token appended: `/events/:slug?preview=<token>`.
4. The public page bypasses Redis cache and renders memories regardless of publication state.

> [!NOTE]
> The preview token is signed with `JWT_ADMIN_SECRET` and expires after 15 minutes. Sharing the URL grants temporary memories visibility to anyone with the link. Treat it as a short-lived access link.

---

### Step 5 — Publish Memories

1. In the Event Memories card, change `publicationState` to **PUBLISHED**.
2. Save the event (calls `PUT /api/admin/events/:id` with the updated `memories` sub-document).
3. The backend:
   - Sets `publishedAt` to the current UTC timestamp (first publish only).
   - Emits audit log action `event.memories.published`.
   - Clears the Redis event cache (`events:*` pattern) so the next public request fetches fresh data.

---

### Step 6 — Operational Verification

After publishing, verify the following:

```bash
# 1. Confirm the public event detail endpoint returns memories
curl https://apm.esparex.in/api/events/<slug>
# Expected: event.memories.publicationState === "PUBLISHED"
# Expected: event.memories.gallery is non-empty (if photos were uploaded)
# Expected: event.status === "COMPLETED"

# 2. Confirm memories are absent on a non-published event (suppression check)
# A different DRAFT event should return memories: null
```

Verify on the public web:
1. Open `https://mad.esparex.in/events/<slug>`
2. Confirm the **EventMemoriesRecap** component renders below the event header.
3. Confirm the "Buy Tickets" button is suppressed (event is COMPLETED).

---

### Hiding Memories (Rollback)

If published memories must be removed from public view without deleting the content:

1. Open the admin event edit page.
2. In the Event Memories card, change `publicationState` to **HIDDEN**.
3. Save the event.
4. The backend emits audit action `event.memories.hidden` and clears the Redis cache.
5. The public event page will no longer render the memories card.

> [!IMPORTANT]
> When memories are re-published after being hidden (`HIDDEN → PUBLISHED`), the backend preserves the original `publishedAt` timestamp. The public-facing "published since" date will not change.

---

### Clearing Memories

To permanently remove the memories sub-document from the event:

1. In the Event Memories card, use the **Clear Memories** action.
2. This sends `memories: null` in the update payload.
3. The backend removes the sub-document, deletes orphaned Cloudinary gallery assets via `safeDeleteImages`, and emits audit action `event.memories.cleared`.

---

### Troubleshooting

| Symptom | Likely Cause | Resolution |
| :--- | :--- | :--- |
| Memories not visible on public page | `publicationState` is not `PUBLISHED` | Set state to `PUBLISHED` and save |
| Preview token link shows old content | Redis cache served stale data | Preview requests bypass cache by design — confirm no proxy is caching the preview URL |
| Gallery upload fails | Cloudinary credential misconfiguration | Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` on Render |
| Preview token expired | Token TTL is 15 minutes | Generate a new preview token from the admin panel |
| "Event has been modified" error on save | Concurrent update — `eventVersion` mismatch | Refresh the event edit page and reapply memories changes |
