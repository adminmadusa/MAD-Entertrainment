---
title: AI Operating System — TypeScript Audit Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/README.md
supersedes: []
---

# TypeScript Audit Skill

* **Skill ID**: SKI-COR-003
* **Purpose**: Verifies source files maintain strong typing and restrict compiler disable comments.
* **Problem Solved**: Unregulated type overrides bypass compilation validation checks and result in fragile production integrations.
* **Required Context**: TypeScript files content.
* **Knowledge Dependencies**: [TYPESCRIPT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/TYPESCRIPT.md).
* **Validation Dependencies**: [TYPESCRIPT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/validation/validators/TYPESCRIPT.md).
* **Confidence Model**: 1.0.
* **Human Review Requirements**: None (any type overrides and disable annotations are rejected).
