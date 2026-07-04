---
title: AI Operating System — React Safety Audit Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/README.md
supersedes: []
---

# React Safety Audit Skill

* **Skill ID**: SKI-COR-004
* **Purpose**: Scans React elements to guarantee hydration safety.
* **Problem Solved**: Mismatches between server-side markup and client-side scripts cause page flicker and broken React tree rendering.
* **Required Context**: React source file contents.
* **Knowledge Dependencies**: [REACT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/REACT.md), [HYDRATION_SAFETY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/frontend/HYDRATION_SAFETY.md).
* **Validation Dependencies**: [REACT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/validation/validators/REACT.md).
* **Confidence Model**: 0.8 (heuristics for unguarded globals checks).
* **Human Review Requirements**: Mismatches detected outside rendering paths can be dismissed if confirmed safe.
