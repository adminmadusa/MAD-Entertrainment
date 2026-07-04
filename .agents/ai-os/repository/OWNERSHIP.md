---
title: AI Operating System — Directory Ownership & Review Matrix
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/repository/README.md
supersedes: []
---

# Directory Ownership & Review Matrix

This document lists the code ownership roles and PR approval review matrices defined for the MAD Entertrainment repository.

## Ownership Roles
* **Repository Governance Owner**: Reviews repository change policy violations and maintains baseline governance configurations.
* **Repository Maintainers**: Core repository maintainers responsible for branches and documentation consistency.
* **Architecture Review Board**: Approves structural changes, ADR decisions, and package boundaries.
* **Architecture Owner**: Approves package boundaries and modifies core architecture documentation.
* **API Owner**: Reviews request/response mutations, endpoints, and interface contracts.
* **Platform/Deployment Owner**: Custodian of environment variables, hosting configurations, DNS setups, and database replica sets.
* **Documentation Owner**: Manages orientation layout structure and human-facing manuals.
* **Security Owner**: Approves authentication, encryption, role-based access configurations, and security patches.

## Document Ownership mapping

| Document | Owner Role | Review Cycle |
|:---------|:-----------|:-------------|
| `README.md` (root) | Documentation Owner | Ongoing |
| `REPOSITORY_GOVERNANCE.md` | Repository Governance Owner | Quarterly |
| `ARCHITECTURE.md` (root) | Architecture Owner | Bi-annual |
| `DEPLOYMENT_MAP.md` (root) | Platform/Deployment Owner | Bi-annual |
| `API_CONTRACTS.md` | API Owner | Ongoing |
| `docs/decisions/` | Architecture Review Board | Ongoing |
| `RUNBOOK.md` | Platform/Deployment Owner | Ongoing |
| `AGENTS.MD` | Repository Governance Owner | Quarterly |

## Business Rule Ownership (SSOT Matrix)
In accordance with system principles, business rules are partitioned strictly across ownership boundaries:
* **Auth, Payments, Bookings, Ticket Status, Pricing, Availability, Seat Locking, RBAC, Notifications**: Owned strictly by the Backend Server (`@mad/server`).
* **UI State, UI Presentation, Spacing, Visual Primitive Components**: Owned by the Frontend Client Workspaces (`@mad/web`, `@mad/admin`).
