# Example Investigation: Test Failure (Platform Case-Sensitivity)

This example incident report demonstrates an investigation where unit or integration tests fail in the CI environment (Linux) due to casing mismatches in file imports, while passing locally (macOS/Windows).

---

## Evidence Summary

| Evidence Component | Status | Source/Notes |
| :--- | :---: | :--- |
| CI Test Error Log | **Collected** (✅) | Captured from GitHub Actions workflow execution |
| Local Replication Attempt | **Collected** (✅) | Tested on local macOS workstation; all tests pass |
| Root Cause Reproduced Locally | **Collected** (✅) | Reproduced on local macOS by changing filesystem mount to case-sensitive |

---

## 1. Failure Category Classification

### Finding: Case-Sensitivity Casing Mismatch
- **Classification**: **Verified Fact**
- **Confidence**: **High**
- **Evidence**:
  - *Diagnostics*: The CI test logs output `Error: Cannot find module './utils/Formatter'`.
  - *Workspace Check*: The actual file on disk is located at `scripts/governance/utils/formatter.ts` (all lowercase `f`), but the import statement in `loader.ts` is `import { format } from './utils/Formatter'`.

---

## 2. Execution Flow and Stop Point

```
pnpm test ➔ vitest runner ➔ imports loader.ts ➔ attempts to resolve Formatter.ts [STOP POINT: File Not Found]
```

---

## 3. Platform Casing Differences Analysis

### macOS (Case-Insensitive)
- The filesystem is case-insensitive.
- When vitest resolves `./utils/Formatter`, the operating system successfully matches `formatter.ts` and returns it. The import succeeds and the tests pass.

### Linux (Case-Sensitive)
- The filesystem is case-sensitive.
- When the runner attempts to resolve `./utils/Formatter`, it searches for a file named exactly `Formatter.ts` (with a capital `F`). Because only `formatter.ts` exists, the lookup fails with `MODULE_NOT_FOUND`.

---

## 4. Next Verification Steps
- [x] Verify the actual filename casing on disk using `git ls-files` to check the case-preserving git index.
- [x] Fix the import statement in `loader.ts` to match the exact filename casing on disk (`./utils/formatter`).

---

## 5. Investigation Status
- **Status**: **Closed**
- **Root cause identified**: **Yes**
- **Parser failure reproduced locally**: **Yes** (via case-sensitive partition)

---

## 6. Investigation Decision Log
- **Decision ID**: `GOV-INV-DEC-002`
- **Current Decision**: Update the import path casing in `loader.ts` to lowercase `formatter` to match the physical file.
- **Reason**: Linux environments require case-exact paths. Correcting the path casing resolves the CI crash without changing code behavior.
