---
title: AI Operating System — Naming Audit Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/README.md
supersedes: []
---

# Naming Audit Skill

* **Skill ID**: SKI-COR-001
* **Purpose**: Evaluates files and folders names to ensure compliance with monorepo casing rules and block temporary/generic folders.
* **Problem Solved**: Out-of-sync naming structures block path mappings and make the repository structure unpredictable.
* **Required Context**: list of path names in target workspaces.
* **Knowledge Dependencies**: [NAMING_CONVENTIONS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NAMING_CONVENTIONS.md).
* **Validation Dependencies**: [NAMING.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/validation/validators/NAMING.md).
* **Confidence Model**: 1.0 (deterministic path pattern matching).
* **Human Review Requirements**: None (violations are automatically rejected).
