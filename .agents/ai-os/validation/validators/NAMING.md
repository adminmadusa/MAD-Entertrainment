---
title: AI Operating System — Naming Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Naming Validator

* **Purpose**: Enforces file naming casing guidelines and blocks disallowed temporary directory creations.
* **Scope**: Global repository files.
* **Inputs**: Path names list.
* **Outputs**: Array of validation findings.
* **Required Knowledge Layers**: Standards (Naming), Repository (Workspaces).
* **Detection Strategy**: Regex evaluation of path names matching standard conventions (PascalCase, camelCase) and checks for blocked folders.
* **Rule IDs**: VAL-NAM-001 (casing mismatches), VAL-NAM-002 (blocked folders).
* **Severity Levels**: HIGH (casing), MEDIUM (folders).
* **Confidence Score**: 1.0 (deterministic path match).
* **Auto-fix Capability**: None (requires manual renaming).
* **False Positive Risks**: Zero.
* **Dependencies**: None.
* **Related Standards**: [NAMING_CONVENTIONS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NAMING_CONVENTIONS.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [GIT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/GIT.md).
