---
title: AI Operating System — Background Job Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Background Job Pattern

* **Pattern ID**: PAT-BE-003
* **Name**: Background Task Queue Worker
* **Purpose**: Offloads slow, blocking workflows into out-of-band execution threads using queues.
* **Problem Solved**: Triggering slow operations (e.g. SMTP email connection, ticket PDF generation) directly inside HTTP controllers blocks Node.js event loops and increases endpoint response times.
* **Applicability**: Asynchronous notifications, document processing, and lock release tasks.
* **Prerequisites**: Redis Cloud connection, BullMQ package.
* **Responsibilities**: Enqueues data payloads, spawns worker instances, and processes tasks.
* **Participants**: Queue Service, Queue Workers, Redis Connection Client.
* **Inputs**: Task identifier and payload variables.
* **Outputs**: Job execution success logs.
* **Dependencies**: Redis, BullMQ.
* **Flow**:
  1. Business action creates a job: `await queueService.addJob('email', payload)`.
  2. Payload is serialized and enqueued in Redis.
  3. Controller responds immediately to client browser.
  4. Out-of-band BullMQ worker pulls job data, executes task, and registers success.
* **Success Criteria**: Web server response times remain under 200ms during heavy write events.
* **Failure Modes**: Redis connection timeout.
* **Trade-offs**: Introduces eventual consistency into visual layouts (users must poll or wait for emails).
* **Limitations**: Requires persistent Redis broker state.
* **Repository Evidence**: `apps/server/src/services/queue.service.ts` configuration.
* **Related Standards**: [PERFORMANCE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/PERFORMANCE.md#STD-PFM-001).
* **Related Architecture**: [PERFORMANCE_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/PERFORMANCE_ARCHITECTURE.md).
* **Related Domains**: [NOTIFICATIONS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/NOTIFICATIONS.md).
* **Related ADRs**: [ADR-002](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Calling SMTP transporters directly inside HTTP endpoint controllers.
* **Examples**:
  ```ts
  import { Queue } from 'bullmq';
  const emailQueue = new Queue('EmailQueue', { connection: redisClient });
  await emailQueue.add('sendOTP', { email, otp });
  ```
* **Verification Checklist**:
  - [x] Slow tasks enqueued in Redis instead of running synchronously.
  - [x] Workers run out-of-band.
  - [x] Job failures trigger standard retries.
