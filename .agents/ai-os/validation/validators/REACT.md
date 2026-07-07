---
title: AI Operating System — React Safety Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# React Safety Validator

* **Purpose**: Identifies unguarded browser globals accesses and restricts danger variables inside components.
* **Scope**: Client React components.
* **Inputs**: Component file contents.
* **Outputs**: Mismatch warnings.
* **Required Knowledge Layers**: Standards (React), Patterns (Hydration Safety).
* **Detection Strategy**: AST analysis searching for `window`, `document`, or `localStorage` that are not contained inside `useEffect` callback arrays or mounted hooks.
* **Rule IDs**: VAL-REC-001 (unguarded globals), VAL-REC-002 (no-danger tags).
* **Severity Levels**: HIGH (mismatches), MEDIUM (danger variables).
* **Confidence Score**: 0.8 (heuristic checks).
* **Auto-fix Capability**: None.
* **False Positive Risks**: Medium (globals inside event callbacks are safe).
* **Dependencies**: React AST parser.
* **Related Standards**: [REACT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/REACT.md).
* **Related Patterns**: [HYDRATION_SAFETY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/frontend/HYDRATION_SAFETY.md).
* **Related Anti-Patterns**: [HYDRATION_MISMATCH.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/frontend/HYDRATION_MISMATCH.md).
* **Related Governance Rules**: [CODE_REVIEW.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/CODE_REVIEW.md).
