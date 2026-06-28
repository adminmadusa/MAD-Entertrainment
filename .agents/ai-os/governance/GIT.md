---
title: AI Operating System — Git Governance
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/governance/README.md
supersedes: []
---

# Git Governance

* **Governance ID**: GOV-GIT-001
* **Purpose**: Enforces repository branch cleanliness and commit traceability.
* **Scope**: Git branch operations and repository updates.
* **Owner**: Repository Governance Owner
* **Branch Safety rules**:
  - Protected branches: `develop` and `live`. Direct commits are blocked.
  - Workstream branches must use approved prefixes: `feat/`, `fix/`, `refactor/`, `audit/`, `docs/`, `test/`, `chore/`, `seo/`.
* **Branch lifecycle Boundaries**:
  - Strict boundary: 1 Issue = 1 Branch = 1 PR. Reusing merged branches or stacking multiple issues on a single branch is forbidden.
  - Deletion: Delete local and remote branches immediately after a PR is merged and verified.
* **Stale Branch Policy**:
  - Any task branch behind `develop` by more than 30 commits is classified as stale.
  - Stale branches must be rebased immediately or closed and deleted.
* **Pruning Schedule**:
  - AI agents and developers must execute branch reviews weekly to prune stale or merged branches.
* **Related Repository Documents**: `AGENTS.md` (Branch Safety, Branch lifecycle management).
