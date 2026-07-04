---
title: AI Operating System — Database Transaction Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Database Transaction Pattern

* **Pattern ID**: PAT-BE-002
* **Name**: Mongoose Transaction Wrapper
* **Purpose**: Guarantees database write atomicity across multi-document mutations.
* **Problem Solved**: Mutating multiple collections (e.g. updating booking status, blocking seats, and generating tickets) without transactions can result in partial failures. If ticket generation fails but booking update succeeds, the system enters an inconsistent state.
* **Applicability**: Service layer workflows performing multiple write operations.
* **Prerequisites**: Mongoose connection to a MongoDB cluster supporting replica set sessions.
* **Responsibilities**: Manages session creation, executes transaction commits, and triggers auto-rollbacks upon failure.
* **Participants**: Mongoose connection client, service transaction wrappers.
* **Inputs**: Callback containing transactional database operations.
* **Outputs**: Resolved transaction return values or aborted transaction errors.
* **Dependencies**: Mongoose ODM.
* **Flow**:
  1. Service initiates transaction execution: `await runInTransaction(async (session) => { ... })`.
  2. Database session is created and transaction begins.
  3. Callback performs queries passing the `session` reference to all Mongoose options.
  4. If callback finishes successfully, the wrapper commits the transaction.
  5. If callback throws an exception, the wrapper aborts the transaction, rolls back changes, and bubbles up the error.
* **Success Criteria**: Atomic operations are committed completely or not at all.
* **Failure Modes**: Missing session parameter references in intermediate queries (leads to operations running outside transaction limits).
* **Trade-offs**: Slightly increased database processing overhead.
* **Limitations**: Requires replica sets.
* **Repository Evidence**: `apps/server/src/utils/transaction.ts` and usages in `apps/server/src/services/public/booking.service.ts`.
* **Related Standards**: [DATABASE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DATABASE.md#STD-DB-001).
* **Related Architecture**: [RESILIENCE_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/RESILIENCE_ARCHITECTURE.md).
* **Related Domains**: [BOOKINGS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/BOOKINGS.md).
* **Related ADRs**: [ADR-002](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Running multiple sequential Mongoose database writes without session transactions.
* **Examples**:
  ```ts
  import { runInTransaction } from '@/utils/transaction';

  await runInTransaction(async (session) => {
    await BookingModel.updateOne({ _id: bookingId }, { status: 'confirmed' }, { session });
    await TicketModel.create([{ bookingId, barcode }], { session });
  });
  ```
* **Verification Checklist**:
  - [x] Multi-document mutations run inside `runInTransaction`.
  - [x] Every query option passes the `{ session }` reference.
  - [x] Test suite checks rollback on thrown exceptions.
