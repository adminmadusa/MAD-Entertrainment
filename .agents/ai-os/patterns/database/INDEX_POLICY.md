---
title: AI Operating System — Database Index Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Database Index Pattern

* **Pattern ID**: PAT-DB-001
* **Name**: Explicit Production Index Creation
* **Purpose**: Safeguards database performance by preventing startup collection lockouts during container scaling events.
* **Problem Solved**: Mongoose schemas build indexes automatically on connection boot by default (`autoIndex: true`). In multi-container scaling, multiple concurrent index builds block MongoDB databases, degrading query response times.
* **Applicability**: All Mongoose schema files.
* **Prerequisites**: Access to MongoDB shell or migrations runner for manual index creation.
* **Responsibilities**: Configures Mongoose schemas to bypass index generation.
* **Participants**: Mongoose schemas, schema options.
* **Inputs**: Schema configuration parameters.
* **Outputs**: Model objects lacking startup index generation actions.
* **Dependencies**: Mongoose ODM.
* **Flow**:
  1. Declare schema fields and options.
  2. Set `autoIndex: false` in schema options parameters.
  3. Initialize model.
  4. Perform index creation separately via migration runners or DB console.
* **Success Criteria**: Web server startup is immediate and decoupled from index checking.
* **Failure Modes**: Missing indexing in dev databases causing slow queries.
* **Trade-offs**: Requires manual index maintenance.
* **Limitations**: Indexes must be tracked in source control separately.
* **Repository Evidence**: Schema conventions matching database settings (`DEPLOYMENT_MAP.md`).
* **Related Standards**: [DATABASE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DATABASE.md#STD-DB-002).
* **Related Architecture**: [ARCHITECTURAL_PRINCIPLES.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/ARCHITECTURAL_PRINCIPLES.md).
* **Related Domains**: [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/README.md).
* **Related ADRs**: [ADR-002](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Leaving autoIndex enabled on high-traffic production models.
* **Examples**:
  ```ts
  const BookingSchema = new Schema({
    bookingId: { type: String, unique: true, index: true },
  }, {
    autoIndex: false
  });
  ```
* **Verification Checklist**:
  - [x] Schema options define `{ autoIndex: false }`.
  - [x] Compilation does not trigger database indexing commands.
