---
title: AI Operating System — Code Review Governance
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/governance/README.md
supersedes: []
---

# Code Review Governance

* **Governance ID**: GOV-REV-001
* **Purpose**: Enforces repository hygiene, file complexity limits, and code longevity constraints.
* **Scope**: Code review tasks and PR audits.
* **Owner**: Repository Governance Owner
* **File Size limits**:
  - **React Components**:
    - 0-300 lines: Preferred limit.
    - 301-500 lines: Review required.
    - 501-700 lines: Refactor required.
    - 701+ lines: PR blocked.
  - **Express Services**:
    - 0-500 lines: Preferred limit.
    - 501-700 lines: Review required.
    - 701+ lines: PR blocked.
  - **Mongoose Schemas**:
    - 0-300 lines: Preferred limit.
    - 301+ lines: Refactor required.
  - **Express Controllers**:
    - 0-200 lines: Preferred limit.
    - 201+ lines: Refactor required.
  - **Absolute limit**: Any file exceeding 1,000 lines is blocked without exception.
* **Orphan Prevention Policy**:
  - New pages, components, API endpoints, or services must identify active consumers. Code lacking active references is rejected.
* **Dead Code Policy**:
  - Unused imports, functions, hooks, state variables, interfaces, types, constants, routes, or files must be deleted prior to PR requests. Committing skeleton files "for future use" is prohibited.
* **Related Repository Documents**: `AGENTS.md` (File Size Governance, Orphan Prevention, Dead Code Policy).
