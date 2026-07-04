---
title: AI Operating System — Pull Request Governance
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/governance/README.md
supersedes: []
---

# Pull Request Governance

* **Governance ID**: GOV-PR-001
* **Purpose**: Enforces style constraints and quality gates before code merges.
* **Scope**: PR reviews and merge approvals.
* **Owner**: Repository Governance Owner
* **Approval Gates**:
  - Code compiles: `pnpm build` completes successfully.
  - Tests pass: `pnpm test` resolves.
  - Formatting is clean: `pnpm lint` reports zero issues.
* **PR Quality Gate Questions**:
  Prior to merge, the reviewing team or AI reviewer must answer:
  1. Is there a single source of truth?
  2. Did we add duplicate logic?
  3. Did we add duplicate validation?
  4. Did we add duplicate UI?
  5. Did we create dead code?
  6. Did we create legacy code?
  7. Did we create orphan UI?
  8. Did we create orphan APIs?
  9. Are frontend and backend aligned?
  10. Are file size limits respected?
  11. Can a new developer understand this in ten minutes?
  - If any answer is **NO**, the PR is blocked and cannot be merged.
* **Related Repository Documents**: `AGENTS.md` (PR Quality Gate).
