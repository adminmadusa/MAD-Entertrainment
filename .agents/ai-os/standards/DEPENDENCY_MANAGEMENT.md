---
title: AI Operating System — Dependency Management
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Dependency Management

This document records the workspace overrides, lockfile conventions, and library installation constraints.

---

### STD-DEP-001
* **Rule ID**: STD-DEP-001
* **Title**: Global Dependency Version Locking
* **Description**: Inter-workspace library packages must resolve using the `workspace:*` identifier in package setups. Package overrides (like `esbuild` and `ws`) are locked at root.
* **Severity**: High
* **Scope**: Workspace package configurations (`package.json`)
* **Rationale**: Out-of-sync workspace links lead to local compiler errors and lockfile duplication.
* **Repository Evidence**: `pnpm-workspace.yaml` setups, `package.json` overrides, and library dependencies.
* **Verification Method**: build validation check (`pnpm build`).

---

### STD-DEP-002
* **Rule ID**: STD-DEP-002
* **Title**: Dependency Exemption Scans
* **Description**: Packages must undergo automated dependency scans. Exceptions for known warnings must be recorded explicitly inside `.audit-exceptions.json`.
* **Severity**: Medium
* **Scope**: Workspace configuration files
* **Rationale**: Prevents committing known vulnerable packages into production builds.
* **Repository Evidence**: `.audit-exceptions.json` at root, and dependency check runners (`scripts/dependency_audit.ts`).
* **Verification Method**: Run audit task script.
