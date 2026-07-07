---
title: AI Operating System — TypeScript Type Safety Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# TypeScript Type Safety Validator

* **Purpose**: Restricts type overrides and comment blocks.
* **Scope**: ts/tsx source files.
* **Inputs**: File AST content.
* **Outputs**: Warnings list.
* **Required Knowledge Layers**: Standards (TypeScript).
* **Detection Strategy**: Scans AST nodes for `TSAnyKeyword` occurrences and checks compiler comments (e.g. `@ts-ignore`).
* **Rule IDs**: VAL-TS-001 (any types), VAL-TS-002 (ts-ignore comments).
* **Severity Levels**: HIGH (any overrides), MEDIUM (directives).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: None.
* **False Positive Risks**: Low.
* **Dependencies**: TypeScript AST compiler.
* **Related Standards**: [TYPESCRIPT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/TYPESCRIPT.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [CODE_REVIEW.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/CODE_REVIEW.md).
