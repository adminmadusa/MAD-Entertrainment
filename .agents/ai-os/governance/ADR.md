---
title: AI Operating System — ADR Governance
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/governance/README.md
supersedes: []
---

# ADR Governance

* **Governance ID**: GOV-ADR-001
* **Purpose**: Manages structural architecture updates and decision tracking.
* **Scope**: Architectural design records.
* **Owner**: Repository Governance Owner
* **Freeze Policy**:
  - The core architecture baseline is frozen. Reopening closed architectural debates without a new ADR is prohibited.
* **ADR Amendment Workflow**:
  - Proposing structural modifications requires creating a new ADR file inside `architecture/decisions/` or recording updates in the ADR catalog.
  - The new ADR must be submitted as a pull request and requires unanimous approval from the architecture review board before merging.
* **Related Repository Documents**: `AGENTS.md` (Single Source of Truth), `docs/decisions/README.md`.
