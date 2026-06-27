# Rollback Plan — STAGING-001

- **Owner**: Site Reliability Engineer / On-Call Lead
- **Verification Date**: 2026-06-27

---

## 1. Trigger Conditions
A rollback should be executed immediately if:
- **Build Crash**: Production build fails on Vercel or Render.
- **Runtime Exception**: Critical errors (e.g. infinite rendering loop, routing crash, Auth OTP failure) are logged on live endpoints.
- **Security Violation**: Unexpected CSP configurations block critical third-party CDNs (Razorpay/Google Auth) in production.
- **Database Corruption**: Backend exceptions indicating schema or seed configuration corruption.

---

## 2. Recovery Procedure

### Step 1: Identify Last Stable Commit
Locate the Git SHA on the `live` branch prior to the release merge:
```bash
git checkout live
git log --oneline -n 10
# Identify the commit SHA before the merge commit (e.g., c70a589)
```

### Step 2: Reset Live Branch Locally
```bash
git reset --hard <LAST_STABLE_SHA>
```

### Step 3: Force Push to Live
```bash
git push origin live --force
```

### Step 4: Deployment Status Verification
- **Vercel**: Monitor the dashboard to verify Vercel triggers a rollback build from the previous commit.
- **Render**: Verify the Render Node API redeploys the stable container.

---

## 3. Communication Channel
Post updates in the Slack channel `#incident-response` detailing:
- The reason for rollback.
- Identified blocker bug.
- Current rollback deployment status.
