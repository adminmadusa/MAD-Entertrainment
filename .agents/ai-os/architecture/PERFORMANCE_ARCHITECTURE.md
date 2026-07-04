---
title: AI Operating System — Performance Architecture
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/architecture/README.md
supersedes: []
---

# Performance Architecture

This document describes the caching patterns, task queue configurations, and database query optimizations.

---

## 1. Caching & Memory Management
* **Redis Cache Buffer**: Short-term configuration caching utilizes `ioredis` buffers.
* **Rate Limiting**: Throttling buffers are distributed using `rate-limit-redis` to prevent single-instance memory depletion.
* **Mongoose Model Buffers**: Query caching prevents database read overhead for static configurations (such as standard enum configurations and category lists).

## 2. Asynchronous Queue Architecture (BullMQ)
* **Broker Setup**: BullMQ workers utilize a dedicated Redis Cloud queue pipeline.
* **Concurrency Configuration**: Background tasks run in separate process loops:
  - **Email Queue**: Dispatches notifications via SMTP.
  - **PDF Generation Queue**: Compiles ticket graphics using `pdfkit`.
  - **Lock Expire Queue**: Processes booking expirations and frees seats automatically.

## 3. Frontend & Network Optimizations
* **Static Page Prerendering**: Public Next.js event catalog pages are generated statically where possible to decrease First Input Delay (FID) and Largest Contentful Paint (LCP) times.
* **CORS Preflight Bypass**: Frontend API calls route directly via local proxy pathing (`/api/*` edge rewrites to Render) to eliminate preflight OPTIONS roundtrip latency.
