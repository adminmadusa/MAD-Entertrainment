---
title: AI Operating System — Architecture Boundaries Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Architecture Boundaries Validator

* **Purpose**: Enforces unidirectional package imports flow and detects circular imports.
* **Scope**: Workspace ts/tsx files.
* **Inputs**: Dependency import graphs.
* **Outputs**: Array of boundary violations.
* **Required Knowledge Layers**: Architecture (Package Boundaries), Repository (Import Rules).
* **Detection Strategy**: AST analysis of imports, verifying against allowed dependencies mappings.
* **Rule IDs**: VAL-ARC-001 (boundary violations), VAL-ARC-002 (circular imports).
* **Severity Levels**: CRITICAL (boundary / circular loops).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: None.
* **False Positive Risks**: Zero.
* **Dependencies**: TypeScript parser, Madge loop checker.
* **Related Standards**: [CONFIGURATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/CONFIGURATION.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [ADR.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/ADR.md).
