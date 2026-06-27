# FIX-001 — Rollout Plan

- **Owner**: Engineering Governance
- **Workstream**: FIX-001
- **Date**: 2026-06-27
- **Status**: COMPLETE

---

## 1. Deployment Architecture

| Environment | Platform | Branch | URL |
|---|---|---|---|
| Staging | Vercel | `develop` | Preview URL |
| Production | Vercel | `live` | `madentertainment.in` |
| Backend | Render | `live` (shared) | — |

> [!IMPORTANT]
> These changes affect HTTP response headers only (CSP, HSTS) and HTML structure
> (skip link). No backend changes are required. No Render deployment is needed.

---

## 2. Deployment Steps

### Step 1 — Merge to `develop`

```bash
git checkout develop
git merge fix/qa-001-sprint1-blockers --no-ff
git push origin develop
```

Vercel will auto-deploy to the staging preview environment.

### Step 2 — Staging Verification

After staging deployment:

1. Open staging URL in Chrome DevTools → Network → response headers
2. Confirm `content-security-policy` header is present and complete
3. Confirm `strict-transport-security` header is present
4. Press `Tab` on homepage — confirm skip link appears
5. Open browser console — confirm zero CSP violations on:
   - `/` (homepage)
   - `/events` (event listing)
   - `/events/[slug]` (event detail + booking modal)
   - `/login` (Google Sign-In)
   - `/dashboard`

### Step 3 — Promote to Production

```bash
git checkout live
git merge develop --no-ff
git push origin live
```

Vercel will auto-deploy to production.

### Step 4 — Production Verification

Repeat Step 2 verification on `madentertainment.in`.

```bash
curl -sI https://madentertainment.in | grep -E "content-security-policy|strict-transport-security|x-frame-options"
```

### Step 5 — Branch Cleanup

```bash
git branch -d fix/qa-001-sprint1-blockers
git push origin --delete fix/qa-001-sprint1-blockers
```

---

## 3. Rollback Procedure

If CSP violations are detected in production:

1. Remove `Content-Security-Policy` line from `next.config.ts` global header rule
2. Commit: `fix(security): remove CSP pending violation investigation`
3. Push → Vercel auto-deploys in < 2 minutes
4. Use `Content-Security-Policy-Report-Only` mode to debug violations without blocking

If HSTS causes issues (should not occur on Vercel/HTTPS):

1. Remove `Strict-Transport-Security` line from `next.config.ts`
2. Commit and push

If skip link causes layout issues:

1. Remove the `<a>` element from `apps/web/src/app/layout.tsx`
2. Commit and push

All changes are a one-line revert. No database migrations, no state cleanup needed.

---

## 4. Post-Rollout Monitoring

After 48 hours in production:

- Check browser error monitoring for any CSP violation reports (once a `report-to` endpoint is added)
- Confirm no customer support tickets relating to Google Sign-In or Razorpay failures
- Run Lighthouse on production to verify accessibility and best-practices scores improvement

---

## 5. Success Criteria

| Criterion | Verification |
|---|---|
| CSP header present on all routes | `curl -I https://madentertainment.in/` |
| HSTS header present on all routes | `curl -I https://madentertainment.in/` |
| No CSP violations in console | Chrome DevTools → Console on all key pages |
| Skip link appears on first Tab | Keyboard test on all pages |
| Google Sign-In functions | End-to-end sign-in test |
| Razorpay checkout functions | End-to-end booking test |
| Cloudinary images load | Visual check on events page |
| Zero hydration warnings | Chrome DevTools Console on production |
