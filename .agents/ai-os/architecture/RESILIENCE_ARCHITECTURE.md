---
title: AI Operating System — Resilience & Recovery
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/architecture/README.md
supersedes: []
---

# Resilience & Recovery

This document outlines the database transaction boundaries, gateway payment idempotency, and background job retry configurations.

---

## 1. Database Transaction Boundaries
To prevent partial writes and database inconsistency, multi-document database modifications are executed within MongoDB transactions using the `runInTransaction` wrapper (`apps/server/src/utils/transaction.ts`):
* **Booking confirmation**: Updating booking status to `confirmed` and creating Ticket records run inside a single transaction.
* **Seat allocation**: Modifying seat layout states (`locked` / `booked`) and updating booking parameters are isolated.

## 2. Idempotency & Duplicate Prevention
* **Payment Webhooks**: Checkout webhook handlers verify transaction IDs against existing payments. If a payment callback has already been resolved, the operation is skipped to prevent duplicate ticket generation.
* **Refund Processing**: Refund service controls check processed refund logs to prevent double-refunding booking amounts.

## 3. Worker Retries & DLQ Configuration
* **Job Retry Strategy**: BullMQ jobs (e.g. ZeptoMail dispatches, PDF compilations) are configured to retry automatically with an exponential backoff retry profile (e.g., 3 retries with a 5-second backoff base).
* **Dead Letter Queue (DLQ)**: Jobs failing all retry attempts are transferred to the DLQ. DLQ alerting alerts administrators via logs and monitoring flags.

## 4. Graceful Shutdown
The API server processes SIGTERM and SIGINT signals:
1. Stops accepting new HTTP connections.
2. Waits for active BullMQ jobs to conclude (with a timeout limit).
3. Closes MongoDB and Redis client connections.
