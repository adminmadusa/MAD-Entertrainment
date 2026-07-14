---
name: "git-pr-audit"
description: "Perform a complete Git Governance Audit for a Pull Request (Post-Merge Verification)."
---

# Git PR Governance Audit (Post-Merge Verification)

Perform a **complete Git Governance Audit** for the specified Pull Request using the Caveman Repository Governance Skill and Git Governance Skill.

Follow the repository governance in `AGENTS.md`.

Do **not** assume anything. Every conclusion must be backed by repository evidence.

---

## Audit Objectives

Verify the complete lifecycle of the Pull Request from branch creation through merge and cleanup.

Determine whether:

* all commits are preserved
* commits were added after PR creation
* commits were removed
* history is clean
* CI status is trustworthy
* merge is complete
* repository remains compliant with governance

---

# Audit Scope

## 1. Audit Snapshot

Provide:

* PR Number
* Branch
* Target Branch
* Status
* Files Changed
* Insertions
* Deletions
* Production Commit Count
* Merge Commit Count
* Outstanding Actions
* Merge Readiness

---

## 2. Executive Summary

Summarize:

* overall merge quality
* scope
* governance compliance
* repository health

---

## 3. Governance Compliance Matrix

Audit:

* One PR = One Problem
* Conventional Commits
* Protected Branch Workflow
* No Direct Develop Commit
* No Debug Code
* No Generated Files
* Branch Cleanup
* Local Develop Sync

Mark each as:

* ✅ Verified
* ⚠ Pending
* ❌ Failed

---

## 4. Evidence Level Assessment

Every conclusion must be classified.

Example:

| Area                  | Evidence Level |
| --------------------- | -------------- |
| Git History           | ✅ Verified     |
| Branch Ancestry       | ✅ Verified     |
| Commit Preservation   | ✅ Verified     |
| Remote Branch Deleted | ✅ Verified     |
| CI Status             | ⚠ Inferred     |

Do not present inferred information as verified.

---

## 5. Branch Audit

Verify:

* branch naming
* branch strategy
* target branch
* protected branch compliance
* remote deletion
* local deletion
* merge commit
* merge strategy
* merge-base ancestry
* orphan commits
* duplicate commits

---

## 6. Commit Audit

Audit every commit.

For each commit report:

* SHA
* Message
* Included in PR
* Added after PR creation
* Removed after PR creation
* Force-pushed?
* Present on develop
* Conventional Commit compliance
* Atomicity
* Scope
* Quality

Verify:

* no WIP commits
* no fixup commits
* no squash mistakes
* no accidental reverts
* no dropped commits

---

## 7. Commit Preservation Audit

Specifically verify:

* Were commits pushed after PR creation?
* Were commits deleted?
* Was force-push used?
* Did final merge preserve every commit?
* Did GitHub squash?
* Did GitHub rebase?
* Did GitHub merge?

Use:

* git log
* git cherry
* git merge-base
* ancestry verification

State explicitly:

> All commits preserved

or

> Missing commits detected

with evidence.

---

## 8. CI Audit

Audit:

* lint
* type-check
* tests
* build
* governance checks
* dependency audit
* secret scanning

Clearly distinguish:

Verified

vs

Inferred

If GitHub Actions cannot be directly inspected, state that CI success is inferred from protected branch merge.

---

## 9. File Audit

Verify:

* files modified
* files added
* files deleted
* generated files
* lock files
* binaries
* documentation
* unexpected files

---

## 10. Scope Audit

Verify:

* One PR = One Problem
* no unrelated files
* no architectural drift
* no API changes outside scope
* no business logic drift
* no dependency changes
* no duplicate logic

---

## 11. Git Hygiene Audit

Audit:

* git status
* staged files
* modified files
* untracked files
* ignored files
* .gitignore
* merge conflicts
* secrets
* binaries

Identify cleanup items separately from merge blockers.

---

## 12. Merge Readiness Audit

Verify:

* merge conflicts
* merge strategy
* branch synchronization
* CI readiness
* safe merge assessment

---

## 13. Post-Merge Verification

Verify:

* merge commit exists
* remote branch deleted
* local branch deleted
* develop synchronized
* commits preserved
* duplicate commits
* orphan commits
* revert commits

---

## 14. Outstanding Actions

Separate:

Required

vs

Optional

Examples:

Required

* sync develop
* delete local branch

Optional

* update .gitignore
* remove stale branches
* cleanup tool directories

---

## 15. Branch Lifecycle Compliance

Audit:

Created

↓

Development

↓

PR Opened

↓

Review

↓

Merged

↓

Remote Deleted

↓

Local Deleted

Show lifecycle completion.

---

## 16. Repository Health Summary

Summarize:

* PR Quality
* Git History
* Branch Hygiene
* CI Confidence
* Architecture Impact
* Business Logic Impact
* Regression Risk
* Repository Status

---

## 17. Final Verdict

Choose exactly one:

✅ MERGE VERIFIED

⚠ MERGED WITH HYGIENE ACTIONS

❌ GOVERNANCE ISSUES DETECTED

❌ MERGE BLOCKED

---

# Audit Rules

* Never assume.
* Every finding must reference repository evidence.
* Clearly separate **Verified** from **Inferred**.
* Do not classify hygiene tasks as merge failures.
* Verify commit ancestry before declaring success.
* Verify commit preservation before declaring success.
* Report any commits added after PR creation.
* Report any commits removed or rewritten.
* Confirm remote and local branch cleanup independently.
* Use repository evidence first; use runtime validation only when necessary.

The output should be a **canonical Git Governance Audit Report** suitable for repository records and future governance reviews.
