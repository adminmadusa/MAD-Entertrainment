---
title: AI Operating System — Asynchronous Controller Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Asynchronous Controller Pattern

* **Pattern ID**: PAT-BE-001
* **Name**: Asynchronous Express Controller
* **Purpose**: Simplifies route handlers by delegating asynchronous exception routing to global middleware wrapper engines.
* **Problem Solved**: Asynchronous callbacks in standard Express do not catch thrown errors automatically. Developers are forced to wrap every handler in repetitive try-catch blocks to call `next(error)`.
* **Applicability**: All Express async routes.
* **Prerequisites**: Global import of `express-async-errors`.
* **Responsibilities**: Executes controller routes, returning JSON payloads or letting exceptions bubble up naturally.
* **Participants**: Express routers, route controllers, error middleware.
* **Inputs**: Client request payloads.
* **Outputs**: JSON responses or thrown errors.
* **Dependencies**: `express-async-errors` module.
* **Flow**:
  1. Client sends request -> matches async handler.
  2. Handler performs database query or execution.
  3. Exception occurs inside promise -> caught by `express-async-errors` wrapper.
  4. Exception routed to the global error middleware automatically.
* **Success Criteria**: Clean endpoint routes without explicit try-catch blocks.
* **Failure Modes**: Missing `express-async-errors` import crashing Express processes.
* **Trade-offs**: Hides the exact line trace in custom controller code blocks.
* **Limitations**: Requires matching the global routing stack.
* **Repository Evidence**: `apps/server/src/server.ts` imports `express-async-errors`.
* **Related Standards**: [NODE_EXPRESS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NODE_EXPRESS.md#STD-EXP-001).
* **Related Architecture**: [REQUEST_LIFECYCLE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/REQUEST_LIFECYCLE.md).
* **Related Domains**: [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/README.md).
* **Related ADRs**: [ADR-002](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Wrapping every controller action in try-catch blocks calling `next(err)`.
* **Examples**:
  ```ts
  // Avoid:
  router.get('/items', async (req, res, next) => {
    try {
      const items = await getItems();
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // Prefer:
  router.get('/items', async (req, res) => {
    const items = await getItems();
    res.json(items);
  });
  ```
* **Verification Checklist**:
  - [x] Route handler is declared `async`.
  - [x] No manual try-catch wrappers exist.
  - [x] App compiles and error middleware triggers on thrown endpoints exceptions.
