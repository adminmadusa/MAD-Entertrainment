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

## Examples
### Safe branch checkout
```bash
git checkout develop
git pull origin develop
git checkout -b feat/my-issue-name
```

## Related Skills
- [pr-review](../pr-review/SKILL.md)
