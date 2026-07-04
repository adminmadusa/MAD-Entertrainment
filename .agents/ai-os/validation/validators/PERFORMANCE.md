---
title: AI Operating System — Performance Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Performance Validator

* **Purpose**: Identifies restricted occurrences of Math.random for identifiers.
* **Scope**: ts/tsx source files.
* **Inputs**: Files content AST.
* **Outputs**: Performance warning findings.
* **Required Knowledge Layers**: Standards (Performance), Patterns (Performance), Anti-Patterns (Math.random IDs).
* **Detection Strategy**: AST check searching for CallExpressions matching `Math.random`.
* **Rule IDs**: VAL-PFM-001 (Math.random usages).
* **Severity Levels**: HIGH (collisions / insecure token risks).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: None (requires swapping with secure crypto calls).
* **False Positive Risks**: Low.
* **Dependencies**: ESLint engine.
* **Related Standards**: [PERFORMANCE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/PERFORMANCE.md).
* **Related Patterns**: [ENV_VALIDATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/infrastructure/ENV_VALIDATION.md).
* **Related Anti-Patterns**: [MATH_RANDOM_IDS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/performance/MATH_RANDOM_IDS.md).
* **Related Governance Rules**: [CODE_REVIEW.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/CODE_REVIEW.md).
