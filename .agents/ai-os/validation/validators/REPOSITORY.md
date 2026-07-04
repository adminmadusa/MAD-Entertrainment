---
title: AI Operating System — Repository Structure Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Repository Structure Validator

* **Purpose**: Verifies that workspace configurations, lockfiles, and package definitions match monorepo hygiene limits.
* **Scope**: Monorepo configurations and workspace scopes.
* **Inputs**: package.json, pnpm-lock.yaml, and pnpm-workspace.yaml file contents.
* **Outputs**: Array of validation findings.
* **Required Knowledge Layers**: Repository, Standards (Dependency Management).
* **Detection Strategy**: Parsing JSON workspaces properties and checking package managers and lockfile integrity.
* **Rule IDs**: VAL-REP-001 (workspace isolation), VAL-REP-002 (package managers lock).
* **Severity Levels**: HIGH (mismatches).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: Yes (run pnpm install or update versions).
* **False Positive Risks**: Zero.
* **Dependencies**: JSON parser.
* **Related Standards**: [DEPENDENCY_MANAGEMENT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DEPENDENCY_MANAGEMENT.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [GIT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/GIT.md).
