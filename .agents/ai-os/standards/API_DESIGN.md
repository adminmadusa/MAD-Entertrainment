---
title: AI Operating System — API Design Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# API Design Standards

This document records the endpoint structure, request/response formats, and OpenAPI schema generation rules.

---

### STD-API-001
* **Rule ID**: STD-API-001
* **Title**: OpenAPI Schema Documentation
* **Description**: Express routes and controller request/response formats must be documented using Zod schemas registered via `zod-to-openapi`.
* **Severity**: Medium
* **Scope**: Express router and controller configurations
* **Rationale**: Keeps Swagger UI documentation in sync with actual controller execution.
* **Repository Evidence**: `apps/server/package.json` dependency `"@asteasolutions/zod-to-openapi": "^7.3.4"`, configured in router definitions.
* **Verification Method**: Inspecting generated Swagger endpoints `/api-docs` or build validations.
* **Example**:
  ```ts
  import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
  const registry = new OpenAPIRegistry();
  ```
