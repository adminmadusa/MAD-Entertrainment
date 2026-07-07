---
title: AI Operating System — Ownership Governance
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/governance/README.md
supersedes: []
---

# Ownership Governance

* **Governance ID**: GOV-OWN-001
* **Purpose**: Maps organizational and technical ownership boundaries to maintain a Single Source of Truth.
* **Scope**: Business domains and workspace elements.
* **Owner**: Repository Governance Owner
* **SSOT Ownership Matrix**:
  - **Auth**: `@mad/server` (Server)
  - **Payments**: `@mad/server` (Server)
  - **Bookings**: `@mad/server` (Server)
  - **Ticket Status**: `@mad/server` (Server)
  - **Pricing**: `@mad/server` (Server)
  - **Availability**: `@mad/server` (Server)
  - **Seat Locking**: `@mad/server` (Server)
  - **RBAC**: `@mad/server` (Server)
  - **Notifications**: `@mad/server` (Server)
  - **UI State**: Frontends (`@mad/web`, `@mad/admin`)
  - **UI Presentation**: Frontends (`@mad/web`, `@mad/admin`)
* **Core Rule**: Frontend workspaces are strictly prohibited from duplicating, editing, or calculating parameters associated with backend business logic (such as ticket availability counts, discount flat/percentage deductions, or session durations).
* **Related Repository Documents**: `AGENTS.md` (Single Source of Truth).
