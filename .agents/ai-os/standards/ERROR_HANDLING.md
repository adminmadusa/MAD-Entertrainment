---
title: AI Operating System — Error Handling Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Error Handling Standards

This document records the error classification models and boundary handling patterns.

---

### STD-ERR-001
* **Rule ID**: STD-ERR-001
* **Title**: Express AppError Usage
* **Description**: Server exceptions returned to clients must throw instances of `AppError` carrying explicit HTTP status codes and error labels.
* **Severity**: High
* **Scope**: Express service and controller files
* **Rationale**: Custom AppError instances prevent leaking sensitive system database traces and return consistent client payloads.
* **Repository Evidence**: `AppError` class usage inside `apps/server/src/middleware/error.middleware` and service logic.
* **Verification Method**: Test suite execution (`pnpm test`).
* **Example**:
  ```ts
  throw AppError.badRequest('Email is required');
  ```
