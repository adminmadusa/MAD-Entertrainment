---
title: AI Operating System — Observability Architecture
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/architecture/README.md
supersedes: []
---

# Observability Architecture

This document describes the structured logging configurations, unhandled error captures, and system health checks.

---

## 1. Structured Logging (Pino)
* **Configuration**: Structured logging utilizes Pino (`pino` and `pino-pretty`).
* **Format**: Logs are rendered as structured JSON strings to enable parsing by log collectors.
* **Metadata Context**: Log calls inject contextual parameters (such as `bookingId`, `paymentId`, `requestSource`, `gateway`) to enable distributed transaction tracking.

## 2. Unhandled Exception Tracking (Sentry)
* **Server integration**: Sentry Node SDK (`@sentry/node`) is initialized on server startup.
* **Scope**: Captures all uncaught exceptions, Express routing errors, and transaction failures, linking trace contexts.
* **Alerting Rules**: Critical exceptions trigger Sentry alert dispatches.

## 3. Operational Audit Logs
* **Purpose**: Records administrative operations (such as processing refunds or modifying ticket profile allocations).
* **Component**: Checked via `auditLog` utilities (`apps/server/src/utils/audit.ts`). Writes audit parameters directly to a dedicated administrative collection.

## 4. Health Checks
* **Endpoint**: `/api/health`
* **Checks**: Verifies database connection pools are active and Redis socket connections are alive. Returns 200 OK or 503 Service Unavailable.
