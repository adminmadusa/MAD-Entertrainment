---
title: AI Operating System — API design Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# API Design Validator

* **Purpose**: Verifies Express routes declare matching OpenAPI/Swagger schemas.
* **Scope**: apps/server controllers and routers.
* **Inputs**: Route definition files.
* **Outputs**: OpenAPI registry alerts.
* **Required Knowledge Layers**: Standards (API Design).
* **Detection Strategy**: Checks route setup definitions against the OpenAPIRegistry Zod schemas configurations.
* **Rule IDs**: VAL-API-001 (missing swagger schemas).
* **Severity Levels**: MEDIUM (undocumented routes).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: None.
* **False Positive Risks**: Zero.
* **Dependencies**: TypeScript compiler.
* **Related Standards**: [API_DESIGN.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/API_DESIGN.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [OWNERSHIP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/OWNERSHIP.md).
