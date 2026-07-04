# Git Workflow Skill

---
name: "git-workflow"
description: "Branch creation, staging, commit rules, and cleanup operations matching MAD guidelines."
---

## Purpose
Enforce branching hygiene, clean history, and safe integration steps for all code and documentation updates.

## When to Use
- When initiating a new development task.
- When creating commits for logical changes.
- When preparing to merge or clean up branches.
- When performing a git repository branch/history cleanup audit.

## Inputs
- **Current branch**: Verified via `git branch --show-current`.
- **Git status**: Verified via `git status --short`.
- **Target branch**: Standard integration branches (`develop` or `live`).

## Outputs
- **Task branch**: Standard prefix branch `feat/*`, `fix/*`, `refactor/*`, etc.
- **Reviewable commits**: Logical, atomic commits mapped to specific phases.

## Constraints
- **No Direct Commits**: Never commit directly to `develop` or `live`.
- **Branch Naming**: Allowed prefixes: `feat/`, `fix/`, `refactor/`, `audit/`, `docs/`, `test/`, `chore/`, `seo/`.
- **Audit Branches**: Branches matching `audit/*` are strictly **read-only**. No edits or commits allowed.
- **One Issue, One Branch**: Do not stack commits or combine unrelated tasks on a single branch.

## Git Repository Audit Protocol
Before proposing any branch deletion, history rewrites, or cleanup actions, you must complete a full Git repository audit using this protocol.

### 1. Repository Status
* What is the current repository status?
* Are there any uncommitted or staged changes?
* Is the working tree clean?
* Which branch is currently checked out?
* Is the local branch tracking the correct remote branch?

### 2. Remote Synchronization
* Has the latest state been fetched from all remotes?
* Are all remote references up to date?
* Are there any stale remote references?
* Does the repository require pruning?

### 3. Local Branch Audit
For every local branch:
* What is the branch purpose?
* When was the last commit?
* Who created it?
* Which issue or PR does it belong to?
* Is it ahead or behind its remote?
* Does it have uncommitted work?
* Is it fully merged?
* Is it partially merged?
* Does it contain unique commits?
* Can it be safely deleted? Why?

Produce a table like:
| Branch | Status | Ahead | Behind | Unique Commits | Merged | Safe Delete | Reason |
| ------ | ------ | ----- | ------ | -------------- | ------ | ----------- | ------ |

### 4. Remote Branch Audit
For every remote branch:
* Is it still active?
* Has a PR been merged?
* Is it abandoned?
* Does it have commits not present elsewhere?
* Is it protected?
* Is it safe to delete? Why?

### 5. Merge Verification
For every feature branch:
* Was it merged? Into which branch?
* By merge commit? Squash merge? Rebase merge? Fast-forward?
* Was the merge successful?
* Was every commit preserved?
* Are there orphan commits?
* Are there duplicate histories?

### 6. Commit Quality Audit
Review every recent commit. Check:
* Clear commit message (Conventional Commit format, references issue/PR)
* Atomic change (no mixed unrelated work, no temporary debugging code, console logs, or dead code)
* Binary/large files or build artifacts included by mistake.
* Secrets or credentials exposed.

Rate every commit: Excellent / Good / Needs Improvement / Risky.

### 7. Merge Commit Audit
Inspect merge commits. Determine:
* Is the merge clean? Any conflicts resolved incorrectly?
* Duplicate merges? Reverted merges? Empty merges? Broken history?

### 8. Branch Lifecycle Audit
For every branch, verify each stage of the lifecycle:
`Created -> Development -> PR Opened -> Reviewed -> Merged -> Deleted Local -> Deleted Remote`

### 9. Safe Branch Deletion Analysis
- **Never delete**: Active branches, protected branches, branches with unique commits, branches with open PRs, or branches under review.
- **Safe to delete**: Fully merged, no unique commits, PR merged, exists in history, and no unpushed work.

### 10. Commit Reachability Audit
Find dangling, lost, orphan, detached HEAD, unreachable commits, or commits only present in the reflog. Can they be recovered?

### 11. Branch Comparison
Compare every feature branch against target branches (`develop`, `main`/`live`, or release branches) to find missing/duplicate commits, cherry-picks, divergence, and ahead/behind counts.

### 12. PR Verification
For each PR: number, branch, merge status, review status, CI/tests status, linked issue, merge strategy, reviewer approvals, and outstanding comments.

### 13. Repository Hygiene
Check for: deleted branches still tracked, stale remotes, old release branches, duplicate feature branches, naming inconsistencies, and long-lived/zombie branches.

### 14. Risk Assessment
Categorize findings into:
* **Critical**: Unique commits at risk, unmerged work, branch divergence, history corruption.
* **Medium**: Old inactive branches, missing PR links, poor commit messages.
* **Low**: Naming inconsistencies, cosmetic cleanup.

### 15. Cleanup Plan
Produce a categorized plan:
- **Safe Actions**: e.g., delete merged local/remote branches, prune stale references.
- **Manual Review Required**: Items requiring human verification.
- **Unsafe Actions**: Branches or commits that must not be removed, with justification.

### 16. Final Repository Health Score
Provide scores (0–100) for: Branch Management, Merge Integrity, Commit Quality, Repository Hygiene, History Integrity, PR Workflow, Cleanup Safety, and Overall Repository Health (include evidence for deductions).

---

## Required Audit Rules
1. **Read-only first**: Perform analysis without modifying the repository.
2. **Evidence-based**: Support every conclusion with Git evidence (`git log`, `git branch`, `git merge-base`, `git reflog`, `git cherry`, etc.).
3. **Never assume**: Do not infer merge status without verification.
4. **Preserve unique work**: Never recommend deleting a branch that contains commits not reachable from the target branch.
5. **Verify before deletion**: Confirm local and remote merge status independently before suggesting cleanup.
6. **Check commit quality**: Evaluate commit messages, atomicity, and repository hygiene.
7. **Report risks explicitly**: Clearly separate safe, manual, and unsafe actions.
8. **Provide reproducible evidence**: Include the Git commands and outputs that support each recommendation.

## Examples
### Safe branch checkout
```bash
git checkout develop
git pull origin develop
git checkout -b feat/my-issue-name
```

## Related Skills
- [pr-review](../pr-review/SKILL.md)
