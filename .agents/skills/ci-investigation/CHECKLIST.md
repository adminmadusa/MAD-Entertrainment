# CI & Build Incident Diagnostic Checklist

Use this checklist to perform systematically ordered diagnostics when a build, test, lint, or deployment fails in the CI pipeline but succeeds locally.

---

## Phase 1: Environment & Tooling Audit
- [ ] Record the runner operating system (`uname -a`, `echo $RUNNER_OS`).
- [ ] Print active runtime and package manager versions:
  - `node -v`
  - `pnpm -v`
  - `npm -v`
- [ ] Inspect the lockfile (`pnpm-lock.yaml` or `package-lock.json`) to check if the workspace uses correct locks.
- [ ] Check versions of transpilation/gating tooling in the workspace:
  - `npx tsx --version`
  - `npx esbuild --version`
  - `npx tsc -v`
  - `npx eslint -v`

---

## Phase 2: Workspace Integrity Verification
- [ ] Verify git commit hashes match exactly (`git rev-parse HEAD`).
- [ ] Run `git status` on the CI runner to check for dirty workspace files or untracked changes.
- [ ] Run `git diff` to ensure no changes were introduced during checkout or intermediate actions.
- [ ] Run `git diff --cached` to verify there are no hidden stages.
- [ ] Scan the workspace for merge conflict markers:
  - `grep -r "<<<<<<<" .`
  - `grep -r "=======" .`
  - `grep -r ">>>>>>>" .`
- [ ] Check line endings of the failing files using `od -c <filename>` or a similar tool to identify CRLF vs LF mismatches.

---

## Phase 3: Compiler & Tooling Isolation
- [ ] Run the underlying transpiler/parser directly in isolation, bypassing any execution wrappers (e.g. run `esbuild` directly if `tsx` fails):
  - `npx esbuild <file_path> --bundle --platform=node --outfile=/dev/null`
- [ ] Run the typechecker directly:
  - `npx tsc --noEmit`
- [ ] Run the linter in verbose mode:
  - `npx eslint <file_path> --debug`
- [ ] Export the exact file causing the failure as a pipeline build artifact for byte-for-byte comparison.

---

## Phase 4: CI vs. Local Comparison
- [ ] Populate the **Evidence Matrix** (use the standard template in [templates/evidence-matrix.md](templates/evidence-matrix.md)).
- [ ] Check filesystem casing: is local macOS/Windows case-insensitive while CI Linux is case-sensitive?
- [ ] Verify package manager cache: try clearing cache on the runner (or run clean build) to exclude cache corruption.

---

## Phase 5: Remediation and Verification
- [ ] Implement the narrowest, most reversible change to address the confirmed discrepancy.
- [ ] Verify the fix resolves the compilation error on both local and remote setups.
- [ ] Remove all temporary diagnostics steps from the workflow file (`ci.yml`).
- [ ] Document the outcome and decisions in the **Incident Report**.
