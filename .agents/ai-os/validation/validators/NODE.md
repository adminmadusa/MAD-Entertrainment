---
title: AI Operating System — Node.js & Express Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Node.js & Express Validator

* **Purpose**: Enforces async error routing and validation middleware setup.
* **Scope**: apps/server Express endpoints.
* **Inputs**: Express route configurations and server controllers.
* **Outputs**: Controller config warnings.
* **Required Knowledge Layers**: Standards (Node Express), Patterns (Async Controller).
* **Detection Strategy**: Verifies server startup includes `express-async-errors` imports, and checks route definitions.
* **Rule IDs**: VAL-EXP-001 (unforwarded async errors), VAL-EXP-002 (missing validation middleware).
* **Severity Levels**: CRITICAL (unhandled crash), HIGH (missing validation validation checks).
* **Confidence Score**: 0.8.
* **Auto-fix Capability**: Yes (insert imports at server entry).
* **False Positive Risks**: Low.
* **Dependencies**: TS AST parser.
* **Related Standards**: [NODE_EXPRESS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NODE_EXPRESS.md).
* **Related Patterns**: [ASYNC_CONTROLLER.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/backend/ASYNC_CONTROLLER.md).
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [CODE_REVIEW.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/CODE_REVIEW.md).
