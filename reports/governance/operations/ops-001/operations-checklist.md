# Operations Checklist — OPS-001

- **Owner**: Release Engineering
- **Verification Date**: 2026-06-27

---

## 1. Release Stage Checklists

### Pre-Deployment Verification
- [x] Run full validation suite (`pnpm type-check && pnpm lint && pnpm test && pnpm build && pnpm governance:docs`)
- [x] Verify MongoDB Atlas cluster and Redis Cloud status are active
- [x] Verify all 16 operational governance reports are generated in `reports/governance/operations/ops-001/`

### Deployment Execution
- [ ] Merge `develop` into `live` branch and push changes to git remote
- [ ] Confirm Vercel Web deployment finishes without errors
- [ ] Confirm Vercel Admin deployment finishes without errors
- [ ] Confirm Render API container build succeeds

### Post-Deployment Smoke Check
- [ ] Test public routes: `/`, `/events`, `/dj-operators`, `/support`
- [ ] Verify security headers are returned using curl:
  ```bash
  curl -sI https://mad.esparex.in/ | grep -iE "content-security-policy|strict-transport-security"
  ```
- [ ] Monitor Sentry dashboard for any crash reports
- [ ] Complete test OTP login flow in production
