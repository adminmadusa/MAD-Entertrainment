---
title: AI Operating System — Configuration Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Configuration Standards

This document records the TypeScript base inheritance conventions, workspace structures, and environmental validations.

---

### STD-CFG-001
* **Rule ID**: STD-CFG-001
* **Title**: TypeScript Inheritance Configs
* **Description**: Workspace compiler configurations (`tsconfig.json`) must extend the base configurations file (`tsconfig.base.json`) located at the repository root.
* **Severity**: High
* **Scope**: TypeScript configurations (`tsconfig.json`)
* **Rationale**: Maintains a unified, consistent compiler target and alias registry across all monorepo workspaces.
* **Repository Evidence**: `tsconfig.base.json` at root and extends declarations (e.g. `apps/web/tsconfig.json` extends `../../tsconfig.base.json`).
* **Verification Method**: build validation check (`pnpm build`).
* **Example**:
  ```json
  {
    "extends": "../../tsconfig.base.json"
  }
  ```
