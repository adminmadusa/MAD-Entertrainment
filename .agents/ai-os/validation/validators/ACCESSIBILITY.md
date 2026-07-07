---
title: AI Operating System — Accessibility Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Accessibility Validator

* **Purpose**: Enforces JSX semantic tags and audits alternative tags mapping.
* **Scope**: UI React components.
* **Inputs**: Component markup code.
* **Outputs**: Accessibility errors.
* **Required Knowledge Layers**: Standards (Accessibility).
* **Detection Strategy**: Scanning markup dependencies using rules from `eslint-plugin-jsx-a11y`.
* **Rule IDs**: VAL-A11Y-001 (missing image alt / accessible labels).
* **Severity Levels**: HIGH (access blocks).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: None.
* **False Positive Risks**: Zero.
* **Dependencies**: ESLint engine.
* **Related Standards**: [ACCESSIBILITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/ACCESSIBILITY.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [CODE_REVIEW.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/CODE_REVIEW.md).
