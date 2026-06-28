---
title: AI Operating System — Node.js & Express Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Node.js & Express Standards

This document registers the asynchronous error handling, middleware integration, and routing rules for Express.

---

### STD-EXP-001
* **Rule ID**: STD-EXP-001
* **Title**: Asynchronous Error Routing
* **Description**: Async Express route handlers must forward exceptions to the global error middleware. This is achieved by importing `express-async-errors` at server startup.
* **Severity**: High
* **Scope**: Express route and controller files
* **Rationale**: Unhandled promise rejections in async Express handlers crash the node process or hang requests indefinitely.
* **Repository Evidence**: `apps/server/package.json` dependency `"express-async-errors": "^3.1.1"`, imported in `apps/server/src/server.ts`.
* **Verification Method**: Test suite execution and unhandled rejection scans.
* **Example**:
  ```ts
  // Handlers do not need try-catch blocks for error forwarding:
  router.get('/data', async (req, res) => {
    const data = await fetchData();
    res.json(data);
  });
  ```
