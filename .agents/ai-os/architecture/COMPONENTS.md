---
title: AI Operating System — Component Architectures
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/architecture/README.md
supersedes: []
---

# Component Architectures

This document registers the major runtime components, their dependencies, and their failure modes.

---

## 1. Client Web App (`@mad/web`)
* **Purpose**: Next.js App Router customer ticket booking interface.
* **Dependencies**: `@mad/shared`, `@mad/types`, `@mad/ui`, `@mad/utils`, `@mad/validations`.
* **Failure Mode**: Serverless bundle fails to load or proxy rewrites fail.
* **Recovery Strategy**: Vercel routes traffic to status pages; Next.js error boundaries catch layout render errors.

## 2. Client Admin App (`@mad/admin`)
* **Purpose**: Next.js App Router administrative management control panel.
* **Dependencies**: `@mad/shared`, `@mad/types`, `@mad/ui`, `@mad/utils`, `@mad/validations`.
* **Failure Mode**: Session loss or scanner device connection issues.
* **Recovery Strategy**: Progressive Web App (PWA) cache stores asset fallback layouts; user is prompted to re-authenticate.

## 3. Core API Server (`@mad/server` controller)
* **Purpose**: Express web API processing routing, validations, and database mutations.
* **Dependencies**: `@mad/shared`, `@mad/validations`, Mongoose, Redis.
* **Failure Mode**: Unhandled database exceptions or CPU thread lockups.
* **Recovery Strategy**: Render restarts the container instance; Sentry logs the trace details.

## 4. Background Task Workers (`@mad/server` BullMQ)
* **Purpose**: Concurrent task workers processing queued emails, ticket PDF renderings, and lock timeouts.
* **Dependencies**: Redis, BullMQ, Mongoose.
* **Failure Mode**: Redis connection drop or PDF rendering crash.
* **Recovery Strategy**: BullMQ automatically schedules job retries using exponential backoffs; failures are logged to the Dead Letter Queue (DLQ).

## 5. Persistence Client (Mongoose)
* **Purpose**: Database communication layer managing schema models, indexing constraints, and transactions.
* **Dependencies**: MongoDB Atlas Replica Set.
* **Failure Mode**: Primary replica election or query timeout.
* **Recovery Strategy**: Mongoose automatically buffers commands and retries transaction loops.
