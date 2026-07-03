# Example Investigation: Deployment Failure (Vercel/Render)

This example incident report outlines an investigation where a production build fails during the deployment phase (e.g. on Vercel or Render) but compiles successfully during local production builds (`npm run build`).

---

## Evidence Summary

| Evidence Component | Status | Source/Notes |
| :--- | :---: | :--- |
| Deployment Build Logs | **Collected** (✅) | Captured from Vercel deployment dashboard |
| Local Production Build Test | **Collected** (✅) | Ran `pnpm build` locally; build passes |
| Environment Variable Dump | **Collected** (✅) | Compared Vercel environment configurations against local `.env` |
| Root Cause Reproduced Locally | **Collected** (✅) | Reproduced locally by clearing the local `.env.local` variables |

---

## 1. Failure Category Classification

### Finding: Missing Environment Variable at Build Time
- **Classification**: **Verified Fact**
- **Confidence**: **High**
- **Evidence**:
  - *Diagnostics*: Vercel build log displays `TypeError: Cannot read properties of undefined (reading 'split')` during static site generation (SSG) of `/[slug]/page.tsx`.
  - *Code Inspection*: The route relies on `process.env.NEXT_PUBLIC_AVAILABLE_DOMAINS.split(',')` to generate static paths.

---

## 2. Execution Flow and Stop Point

```
vercel build ➔ next build ➔ lint checks ➔ static page generation ➔ Slugs Page [STOP POINT: TypeError]
```

---

## 3. Environment Variable Analysis

### Local Workspace
- The file `.env.local` contains `NEXT_PUBLIC_AVAILABLE_DOMAINS=example.com,test.com`.
- During local production build (`pnpm build`), Next.js loads this file, injecting the value successfully.

### Vercel Runner
- The Vercel project environment variables setting page is missing the key `NEXT_PUBLIC_AVAILABLE_DOMAINS`.
- During static page generation, the variable resolves to `undefined`, crashing the `split()` function call.

---

## 4. Next Verification Steps
- [x] Check the Vercel Project settings dashboard to confirm the presence of the environment variable.
- [x] Add a fallback guard in code: `(process.env.NEXT_PUBLIC_AVAILABLE_DOMAINS || '').split(',')` to prevent future compilation crashes if variables are omitted.

---

## 5. Investigation Status
- **Status**: **Closed**
- **Root cause identified**: **Yes**
- **Build failure reproduced locally**: **Yes**

---

## 6. Investigation Decision Log
- **Decision ID**: `GOV-INV-DEC-003`
- **Current Decision**: Add the missing environment variable to Vercel and introduce a defensive code check.
- **Reason**: Corrects the build crash immediately and implements a guard to prevent future build-time regressions if environments are configured differently.
