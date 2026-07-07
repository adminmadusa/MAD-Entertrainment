---
title: AI Operating System — Architectural Principles
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/architecture/README.md
supersedes: []
---

# Architectural Principles

This document outlines the core technical principles and invariants governing platform design and system boundaries.

---

## 1. Single Source of Truth (SSOT)
* **Principle**: The backend server (`@mad/server`) is the sole custodian of business domain rules, state machines, and calculations. Frontends must only represent state and capture inputs.
* **In Practice**: Frontend workspaces are prohibited from calculating pricing totals, assessing coupon validity, or determining reservation lock periods. They must call Express API endpoints and parse responses.

## 2. Decoupled Asynchronous Processing
* **Principle**: Blocking, resource-heavy operations must run out-of-band using background queues.
* **In Practice**: Generating PDF ticket documents, invoking external SMTP gateways, or executing media cleanups must be enqueued into BullMQ jobs. Controller threads must return immediate HTTP receipts.

## 3. Environment-Agnostic Build Artifacts
* **Principle**: Compilations must be immutable across promotions. Environmental details are injected strictly at runtime.
* **In Practice**: All configurations (database URIs, Stripe secret keys, CORS origins) are parsed at runtime using Zod environment validation checks. Hardcoding environment checks inside build bundles is forbidden.

## 4. Database Concurrency & Index Integrity
* **Principle**: Database indexes must be managed explicitly to prevent execution lockouts.
* **In Practice**: Mongoose `autoIndex` configuration is disabled (`autoIndex: false`) for all production builds to prevent collection locks during scaling events. Multi-document edits must run inside atomic database transactions (`runInTransaction` wrappers).
