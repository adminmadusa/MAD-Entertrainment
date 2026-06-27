# Smoke Test Results — STAGING-001

- **Owner**: Testing / QA Lead
- **Status**: PASSED
- **Verification Date**: 2026-06-27

---

## 1. Execution Log
Smoke tests were executed against the production build running locally.

| Test Case ID | Path | Test Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| SMOKE-001 | `/` | Open homepage | Page load success | Loaded home page elements | ✅ Pass |
| SMOKE-002 | `/events` | View active events | HOLI-XPLOSION card visible | Displayed HOLI-XPLOSION card | ✅ Pass |
| SMOKE-003 | `/dj-operators` | View DJ list | DJ Shaan & DJ Swapna visible | Cards load successfully | ✅ Pass |
| SMOKE-004 | `/login` | Trigger OTP flow | OTP input field appears | OTP code fields render | ✅ Pass |
| SMOKE-005 | `/dashboard` | Access without JWT | Redirect to login | Redirected to `/login` | ✅ Pass |
| SMOKE-006 | `/does-not-exist` | Verify 404 | Custom 404 page | Branded 404 page loads | ✅ Pass |
| SMOKE-007 | `/robots.txt` | Read search engine rules | Return text rules | Content visible | ✅ Pass |
| SMOKE-008 | `/sitemap.xml` | Read index maps | Return XML data map | Content visible | ✅ Pass |

---

## 2. Findings
- **Compilation Warning**: The Next.js image loader logs a warning regarding missing width calculations for `/images/dj_turntables_404.png`. This is a low-impact asset warning and does not affect the layout.
- **Redirect Latency**: Under localhost, Auth redirect latency is under 15ms.

---

## 3. Verdict
**PASS**: All vital public and protected routes are active and functional.
