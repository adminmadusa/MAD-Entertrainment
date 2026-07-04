---
title: AI Operating System — Naming Conventions
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Naming Conventions

This document records the file casing, directory qualifiers, and folder naming constraints.

---

### STD-NAM-001
* **Rule ID**: STD-NAM-001
* **Title**: Code File Naming casing
* **Description**: Source code files must comply with explicit naming structures:
  - React Component Layout: PascalCase (e.g. `ProfileEditor.tsx`).
  - React Custom Hook: camelCase starting with "use" (e.g. `useAuth.ts`).
  - Services / Controllers / Routes: camelCase carrying qualifiers (e.g. `booking.service.ts`, `auth.controller.ts`, `team.routes.ts`).
  - Unit Test Suite: Matches source file name with `.test.` extension (e.g. `refund.service.test.ts`).
* **Severity**: High
* **Scope**: Workspace files
* **Rationale**: Maintains a clean, predictable file system that simplifies automated code generation.
* **Repository Evidence**: monorepo file structure conventions.
* **Verification Method**: build verification checks.

---

### STD-NAM-002
* **Rule ID**: STD-NAM-002
* **Title**: Disallowed Directory Names
* **Description**: Creating temporary folders carrying generic labels (such as `temp`, `old`, `backup`, `misc`) is prohibited.
* **Severity**: Medium
* **Scope**: Directory creation
* **Rationale**: prevents repository clutter and ensures clear file ownership.
* **Repository Evidence**: Governance rules (`REPOSITORY_GOVERNANCE.md` hygiene rules).
* **Verification Method**: Static directory structure scans.
