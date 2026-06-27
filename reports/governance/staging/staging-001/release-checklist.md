# Release Checklist — STAGING-001

- **Owner**: Release Manager
- **Verification Date**: 2026-06-27

---

## Pre-Release Phase (Verify Develop)
- [x] Run full local validation gates: `pnpm type-check && pnpm lint && pnpm test && pnpm build && pnpm governance:docs`.
- [x] Verify local staging database connections (MongoDB/Redis) are running.
- [x] Verify no console errors or hydration regressions exist on public routes.
- [x] Verify skip-to-main content accessibility link renders visually when focused.
- [x] Confirm all governance reports under `reports/governance/staging/staging-001/` have been generated.

## Execution Phase (Branch Promotion)
- [ ] Checkout to `live` branch: `git checkout live`.
- [ ] Pull latest changes: `git pull origin live`.
- [ ] Merge `develop` into `live` (no-fast-forward): `git merge develop --no-ff -m "chore: release develop to live [STAGING-001]"`.
- [ ] Push to GitHub remote: `git push origin live`.

## Deployment Phase (Production Monitoring)
- [ ] Confirm Vercel Production deployment completes successfully.
- [ ] Confirm Render Production API build finishes successfully.
- [ ] Verify production HTTP headers via curl to confirm CSP and HSTS are active:
  ```bash
  curl -sI https://mad.esparex.in/ | grep -iE "content-security-policy|strict-transport-security"
  ```
- [ ] Run basic smoke test on the live website (`https://mad.esparex.in/`).
- [ ] Check Sentry dashboard for any new error traces or exceptions.
