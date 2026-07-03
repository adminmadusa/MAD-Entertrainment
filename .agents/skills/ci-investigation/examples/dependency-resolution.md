# Example Investigation: Dependency Resolution Failure (Lockfile Conflict)

This example incident report outlines an investigation where `pnpm install` or `npm ci` fails on the CI runner due to a package resolution error or node_modules caching anomaly, but runs cleanly locally.

---

## Evidence Summary

| Evidence Component | Status | Source/Notes |
| :--- | :---: | :--- |
| CI Installation Logs | **Collected** (✅) | Captured from Github Actions installation step |
| Local Package Clean Install | **Collected** (✅) | Deleted local `node_modules` and ran `pnpm install`; succeeded |
| Package Manager Cache Reset | **Collected** (✅) | Cleared local store; install still passes locally |
| Workspace Lockfile Diff | **Collected** (✅) | Analyzed git diff for `pnpm-lock.yaml` |

---

## 1. Failure Category Classification

### Finding: Out-of-Sync Package Lockfile
- **Classification**: **Verified Fact**
- **Confidence**: **High**
- **Evidence**:
  - *Diagnostics*: CI installation logs display `ERR_PNPM_OUT_OF_DATE_LOCKFILE: Cannot install with "frozen-lockfile" because the lockfile is out of date`.
  - *Git History*: A recent PR updated dependencies in `package.json` but the author did not run `pnpm install` to update `pnpm-lock.yaml`, or ran it using a different package manager version that generated a different format.

---

## 2. Execution Flow and Stop Point

```
git checkout ➔ pnpm install --frozen-lockfile [STOP POINT: Out-of-date Lockfile]
```

---

## 3. Lockfile Drift Analysis

### Local Workspace
- Developers running `pnpm install` locally modify the lockfile automatically if it is out of sync. This masks the drift because the installation succeeds and updates the local untracked file.
- The developer forgot to stage and commit the updated `pnpm-lock.yaml` file.

### CI Environment
- CI is configured with `pnpm install --frozen-lockfile` (frozen installation) to guarantee deterministic builds.
- Because `package.json` contains dependency definitions that do not match the entries in `pnpm-lock.yaml`, the runner rejects the installation.

---

## 4. Next Verification Steps
- [x] Run `git diff pnpm-lock.yaml` to confirm if there are unstaged lockfile updates locally.
- [x] Run a fresh install locally, commit the generated lockfile changes, and push.

---

## 5. Investigation Status
- **Status**: **Closed**
- **Root cause identified**: **Yes**
- **Installation failure reproduced locally**: **Yes** (via `pnpm install --frozen-lockfile` simulation)

---

## 6. Investigation Decision Log
- **Decision ID**: `GOV-INV-DEC-004`
- **Current Decision**: Commit the updated `pnpm-lock.yaml` that matches `package.json`.
- **Reason**: Aligns package descriptions with lockfile requirements, resolving the frozen-lockfile mismatch in CI.
