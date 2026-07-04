---
title: AI Operating System — Audit Governance
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/governance/README.md
supersedes: []
---

# Audit Governance

* **Governance ID**: GOV-AUD-001
* **Purpose**: Manages code investigations, diagnostics, and workspace discovery.
* **Scope**: Diagnostics and read-only analysis tasks.
* **Owner**: Repository Governance Owner
* **Approval Workflow**:
  - Auditing is read-only by default. Initiating an audit task does not require formal ticket approval.
  - Transitioning from an audit task to an implementation task requires a formal issue branch and ticket approval.
* **Audit Branch constraints**:
  - Audit branches must match the naming prefix `audit/<name>`.
  - Commits, package installations, code modifications, or package deployments are strictly forbidden on audit branches.
  - The branch must be deleted immediately after findings are documented.
* **Manual Verification Gate**:
  - Before transitioning from audit to edit, the agent must output:
    - Current Branch
    - Git Status
    - Files To Change
    - Reason For Change
    - Risk Level
    - Patch Summary
    - Verification Plan
    - Rollback Plan
  - The agent must stop and wait for explicit human confirmation containing: `Approved to edit: <file>` before committing changes.
* **Related Repository Documents**: `AGENTS.md` (Manual Verification Gate and Branch Safety).
