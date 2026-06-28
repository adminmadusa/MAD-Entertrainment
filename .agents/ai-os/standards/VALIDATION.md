---
title: AI Operating System — Validation Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Validation Standards

This document records the schemas structure, package dependencies, and validation rules for input payloads.

---

### STD-VAL-001
* **Rule ID**: STD-VAL-001
* **Title**: Centralized Zod Validation Schemas
* **Description**: Input payload validation must use schemas imported from `@mad/validations` rather than creating independent checks inside clients or server route configurations.
* **Severity**: High
* **Scope**: Express routes, Next.js forms
* **Rationale**: Duplicating validation logic across workspaces triggers validation drift where client requirements mismatch API limits.
* **Repository Evidence**: `@mad/validations` package dependencies in `@mad/web`, `@mad/admin`, `@mad/server`.
* **Verification Method**: Code review.
