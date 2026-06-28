---
title: AI Operating System — Testing Governance
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/governance/README.md
supersedes: []
---

# Testing Governance

* **Governance ID**: GOV-TST-001
* **Purpose**: Enforces testing gates and coverage mandates before release promotion.
* **Scope**: PR testing tasks and CI verification pipelines.
* **Owner**: Repository Governance Owner
* **Approval Workflow**:
  - Test suites must run locally before staging commits.
  - CI execution runs test suites against workspace changes. A single failure blocks PR validation.
* **Failing Test Policy**:
  - Disabling or ignoring failing tests (e.g. using `describe.skip` or commenting out assertions) is blocked.
  - Failures must be corrected in-place.
* **High-Risk Area Verification**:
  - Changes to payment controllers, authentication routes, and Mongoose transactional adapters must include dedicated integration tests.
* **Related Repository Documents**: `AGENTS.md` (Testing Governance, High Risk Areas), `TESTING.md` at root.
