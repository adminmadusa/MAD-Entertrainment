---
title: AI Operating System — Git Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Git Standards

This document records the branch naming rules, commit formatting guidelines, and PR lifecycle rules.

---

### STD-GIT-001
* **Rule ID**: STD-GIT-001
* **Title**: Branch Naming Prefixes
* **Description**: Task branches must carry approved prefix categories:
  - New feature: `feat/<name>`
  - Bug correction: `fix/<name>`
  - Refactoring task: `refactor/<name>`
  - Document check: `audit/<name>`
  - Documentation updates: `docs/<name>`
  - Test suites updates: `test/<name>`
  - Dependency/chore updates: `chore/<name>`
  - SEO optimization: `seo/<name>`
* **Severity**: High
* **Scope**: Git branches
* **Rationale**: Maintains a clean, searchable git history and isolates release updates.
* **Repository Evidence**: Governance rules (`REPOSITORY_GOVERNANCE.md` branch lifecycle rules).
* **Verification Method**: git branch validation hooks.

---

### STD-GIT-002
* **Rule ID**: STD-GIT-002
* **Title**: Conventional Commit Messages
* **Description**: Commit messages must follow Conventional Commit rules specifying type, scope (optional), and description.
* **Severity**: Medium
* **Scope**: Git commits
* **Rationale**: Enables auto-generating changelogs and trace version bumps.
* **Repository Evidence**: commit log history.
* **Verification Method**: Commit lint hooks.
* **Example**:
  ```
  feat(ai-os): implement Phase 5 Standards Layer
  ```
