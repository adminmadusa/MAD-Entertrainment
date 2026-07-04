---
title: AI Operating System — Architecture Review Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/README.md
supersedes: []
---

# Architecture Review Skill

* **Skill ID**: SKI-COR-002
* **Purpose**: Evaluates package imports to prevent architectural boundary violations and circular loops.
* **Problem Solved**: Circular package references or boundary violations break build isolation and modular coupling.
* **Required Context**: Dependency imports graph mappings.
* **Knowledge Dependencies**: [PACKAGE_BOUNDARIES.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/PACKAGE_BOUNDARIES.md).
* **Validation Dependencies**: [ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/validation/validators/ARCHITECTURE.md).
* **Confidence Model**: 1.0 (exact AST imports parsing).
* **Human Review Requirements**: None for circular references; boundaries mismatch requires verification if custom alias configurations exist.
