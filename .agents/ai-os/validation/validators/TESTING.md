---
title: AI Operating System — Testing Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Testing Validator

* **Purpose**: Enforces test qualifiers and verifies files exist.
* **Scope**: Global testing scopes.
* **Inputs**: Path list.
* **Outputs**: Suite naming alerts.
* **Required Knowledge Layers**: Standards (Testing).
* **Detection Strategy**: Checks files names match standard conventions (`*.test.ts` / `*.test.tsx`).
* **Rule IDs**: VAL-TST-001 (incorrect test casing / naming).
* **Severity Levels**: HIGH (naming drift).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: None.
* **False Positive Risks**: Zero.
* **Dependencies**: None.
* **Related Standards**: [TESTING.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/TESTING.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [TESTING.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/TESTING.md).
