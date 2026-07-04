---
title: AI Operating System — CI/CD Pipeline Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# CI/CD Pipeline Standards

This document records the pipeline orchestration tasks, task dependency pipelines, and merge quality gate requirements.

---

### STD-CI-001
* **Rule ID**: STD-CI-001
* **Title**: Turborepo Task Pipeline
* **Description**: Monorepo build and test tasks must run via Turborepo. Tasks must declare explicit dependent builds (`dependsOn`) to enforce topological compilation ordering.
* **Severity**: High
* **Scope**: Turborepo configurations (`turbo.json`)
* **Rationale**: Bypassing pipeline dependency graphs triggers compilation failures or uses stale cache assets.
* **Repository Evidence**: `turbo.json` configuration at root (declares pipeline dependencies and outputs).
* **Verification Method**: build validation check (`pnpm build`).

---

### STD-CI-002
* **Rule ID**: STD-CI-002
* **Title**: Pull Request Quality Gate
* **Description**: Merging changes into the protected branches (`develop`, `live`) requires full success of compile tasks (`pnpm build`), test runs (`pnpm test`), and style/lint checks (`pnpm lint`).
* **Severity**: High
* **Scope**: Pull requests
* **Rationale**: prevents compiling syntax errors or broken test runs into staging and production branches.
* **Repository Evidence**: GitHub workflow configurations and `REPOSITORY_GOVERNANCE.md`.
* **Verification Method**: CI run logs.
