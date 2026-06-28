---
title: AI Operating System — AutoIndex in Prod Anti-Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/anti-patterns/README.md
supersedes: []
---

# AutoIndex in Prod Anti-Pattern

* **Anti-Pattern ID**: ANT-DB-001
* **Name**: Schema AutoIndex Enabled in Production
* **Category**: Database
* **Severity**: High
* **Problem**: Leaving Mongoose's default auto-indexing option active (`autoIndex: true` or default) on collections running in production.
* **Symptoms**: Web server containers start slowly during deployment, queries timeout on boot, or database CPU spikes during container scaling tasks.
* **Why It Is Harmful**: When container nodes scale up under load, they execute Mongoose connection blocks on startup. If auto-indexing is active, Mongoose executes index build requests. If the database collections hold millions of records, index verification blocks write lock pools, causing query timeouts.
* **Repository Evidence**: Mongoose schema setup guidelines.
* **Related Standards**: [DATABASE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DATABASE.md#STD-DB-002).
* **Related Architecture**: [ARCHITECTURAL_PRINCIPLES.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/ARCHITECTURAL_PRINCIPLES.md).
* **Related Pattern**: [INDEX_POLICY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/database/INDEX_POLICY.md).
* **Detection Method**:
  - **AI Check**: Scan Mongoose Schema definitions for schemas that do not explicitly set `autoIndex: false` in their options objects.
  - **Static Analysis**: Search schema options for autoIndex values.
* **Prevention Strategy**: Force all Mongoose schemas to pass `{ autoIndex: false }` option flags on instantiation.
* **Refactoring Strategy**: Update schema options block.
* **Verification Method**: Code review.
* **Examples**:
  ```ts
  // BAD: Schema auto-indexing is enabled by default
  const UserSchema = new Schema({ email: String });

  // GOOD: AutoIndex is explicitly disabled
  const UserSchema = new Schema({ email: String }, { autoIndex: false });
  ```
