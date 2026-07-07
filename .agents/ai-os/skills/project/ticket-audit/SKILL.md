---
title: AI Operating System — Ticket Audit Project Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/project/README.md
supersedes: []
---

# Ticket Audit Project Skill

* **Skill ID**: SKI-PRJ-004
* **Purpose**: Scans ticket generation, profile assignments, and scanner auth guards to verify security boundaries.
* **Repository Scope**: `@mad/server` tickets and scanner controllers, `@mad/web` ticket dashboards.
* **Business Context**: Entry tickets PDF rendering, scanner authentication, and event check-in state validation.
* **Required Inputs**: Ticket controllers source files.
* **Produced Outputs**: Ticket and barcode scanner safety audits.
* **AI OS Dependencies**: [TICKETS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/TICKETS.md), [COMPONENTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/COMPONENTS.md).
* **Core Skill Dependencies**: `architecture-review`.
* **Validation Dependencies**: `VAL-ARC-001`, `VAL-DB-001`.
* **Confidence Model**: 0.8.
* **Human Review Requirements**: Scanner RBAC updates require security architect review.
