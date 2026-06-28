---
title: AI Operating System — Governance Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Governance Validator

* **Purpose**: Enforces One Task Rules and checks manual verification gates.
* **Scope**: Workspace status and git commits.
* **Inputs**: Git status, active branch name, and edit approval logs.
* **Outputs**: Governance violations.
* **Required Knowledge Layers**: Governance (Audit, Git, Pull Request).
* **Detection Strategy**: Monitors changes to target code outside issue branches, checks git log conventions, and checks for approval tokens in edit actions.
* **Rule IDs**: VAL-GOV-001 (direct edit without approval token), VAL-GOV-002 (multiple active branches).
* **Severity Levels**: CRITICAL (One Task Rule breach), HIGH (manual gate breach).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: None (aborts execution).
* **False Positive Risks**: Zero.
* **Dependencies**: Git execution environment.
* **Related Standards**: [GIT_STANDARDS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/GIT_STANDARDS.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [AUDIT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/AUDIT.md), [GIT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/GIT.md), [PULL_REQUEST.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/PULL_REQUEST.md).
