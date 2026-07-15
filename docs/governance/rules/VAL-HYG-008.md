# VAL-HYG-008

Protected Branch Modification

---

## Purpose

Detects direct modifications made on protected branches (e.g. `develop`, `live`, `main`, `master`) instead of task-specific feature/fix branches.

---

## Description

To maintain repository hygiene and branch safety, direct edits on protected branches are strictly prohibited. All work must occur on task branches (`feat/*`, `fix/*`, etc.) and be merged via Pull Requests.

---

## Rationale

Editing code directly on main/develop branches bypasses the peer review (PR) process, breaks continuous integration gating, increases regression risks, and causes synchronization issues for other developers. This check fails the build immediately (`FAIL_BUILD`) on a local level to enforce workflow boundaries.

---

## Detection

Checks the current local git branch name and matches it against a list of protected branches. If a protected branch has staged/unstaged changes, a critical error is reported.

---

## Severity

**CRITICAL**

Bypassing branch boundaries is a fundamental violation of repository governance.

---

## CI Policy

**FAIL_BUILD**

Violations block local and CI execution immediately.

---

## Owner

Platform Team

---

## Governance Source

| Field | Value |
|-------|-------|
| Standard | Git Workflow |
| Document | AGENTS.md |
| Section | BRANCH SAFETY |

---

## Examples

### ✅ Compliant

* Running checks on branch `feat/ui-governance-automation`
* Running checks on a clean `develop` branch with no uncommitted changes

### ❌ Non-Compliant

```bash
# Working on develop with uncommitted changes:
git branch --show-current
# Output: develop
git status
# Output: modified: some_file.ts
```

---

## Acceptance Criteria

**PASS**: Current branch is not a protected branch (e.g., `develop`, `live`), OR the working tree is clean.

**FAIL**: Current branch is a protected branch AND there are uncommitted modifications.

---

## False Positives

None. If you need to make changes, they must be committed and pushed on a task branch.

---

## Remediation

Stash your current changes, checkout a task branch, and pop your changes back:
```bash
git stash
git checkout -b feat/your-feature-name
git stash pop
```

---

## Related Rules

- VAL-HYG-001 through VAL-HYG-007.

---

## Version History

| Version | Date | Summary of changes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-07-07 | Rule registered — Git workflow safety alignment |
