---
title: AI Operating System — Booking Audit Project Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/project/README.md
supersedes: []
---

# Booking Audit Project Skill

* **Skill ID**: SKI-PRJ-002
* **Purpose**: Evaluates booking controller and database model queries to verify transaction boundary safety and session forwarding.
* **Repository Scope**: `@mad/server` bookings and tickets services.
* **Business Context**: Multi-collection writes spanning booking reservations, seat locks, and ticket allocations.
* **Required Inputs**: Booking service files.
* **Produced Outputs**: Transaction boundary audits.
* **AI OS Dependencies**: [BOOKINGS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/BOOKINGS.md), [RESILIENCE_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/RESILIENCE_ARCHITECTURE.md).
* **Core Skill Dependencies**: None.
* **Validation Dependencies**: `VAL-DB-001`, `VAL-EXP-001`.
* **Confidence Model**: 0.8.
* **Human Review Requirements**: Schema index adjustments require DB lead review.
