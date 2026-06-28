---
title: AI Operating System — Missing Transactions Anti-Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/anti-patterns/README.md
supersedes: []
---

# Missing Transactions Anti-Pattern

* **Anti-Pattern ID**: ANT-BE-001
* **Name**: Multi-Document Write Without Session
* **Category**: Backend
* **Severity**: High
* **Problem**: Executing updates across multiple database collections or documents inside Express service handlers without encapsulating them in Mongoose transactions.
* **Symptoms**: DB inconsistency (e.g. Booking table enters `confirmed` state, but Ticket creations fail; seats are locked but booking record expires).
* **Why It Is Harmful**: MongoDB does not enforce atomic cross-document writes by default. In case of network drops or server restarts between sequential writes, the database is left in a corrupted state, leading to discrepancies that require manual database intervention.
* **Repository Evidence**: Integration test suites verifying database exceptions and transactions validations.
* **Related Standards**: [DATABASE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DATABASE.md#STD-DB-001).
* **Related Architecture**: [RESILIENCE_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/RESILIENCE_ARCHITECTURE.md).
* **Related Pattern**: [TRANSACTION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/backend/TRANSACTION.md).
* **Detection Method**:
  - **AI Check**: Identify service functions making multiple distinct write calls (like `create`, `updateOne`, `save`) that do not run inside `runInTransaction`.
  - **Static Analysis**: Scan service files for sequential write commands lacking session configurations.
* **Prevention Strategy**: Force all workflows that mutate multiple collections or documents to run inside `runInTransaction` wrappers.
* **Refactoring Strategy**: wrap the sequential Mongoose calls inside a callback function passed to `runInTransaction` and append `{ session }` configurations to all model writes.
* **Verification Method**: Execute integration test suites (`pnpm test`).
* **Examples**:
  ```ts
  // BAD: Sequential writes without database transaction boundaries
  async function confirmBooking(bookingId: string) {
    await BookingModel.updateOne({ _id: bookingId }, { status: 'confirmed' });
    await TicketModel.create([{ bookingId, barcode }]); // If this crashes, the booking remains confirmed!
  }

  // GOOD: encapsulated inside transaction block
  async function confirmBooking(bookingId: string) {
    await runInTransaction(async (session) => {
      await BookingModel.updateOne({ _id: bookingId }, { status: 'confirmed' }, { session });
      await TicketModel.create([{ bookingId, barcode }], { session });
    });
  }
  ```
