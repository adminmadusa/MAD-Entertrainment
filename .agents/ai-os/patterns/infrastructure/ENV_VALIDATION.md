---
title: AI Operating System — Environment Validation Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Environment Validation Pattern

* **Pattern ID**: PAT-IF-001
* **Name**: Zod-based Runtime Env Validation
* **Purpose**: Prevents startup of misconfigured application instances by checking environment variables immediately at boot time.
* **Problem Solved**: Applications reading `process.env.VARIABLE` directly inside services face delayed runtime crashes (e.g., throwing unhandled exceptions after a client invokes a service requiring missing secrets).
* **Applicability**: Next.js client frontends, Express API backends.
* **Prerequisites**: Zod library.
* **Responsibilities**: Defines env schema, executes parse rules on load, throws validation errors if environment parameters are invalid.
* **Participants**: Env schema configuration, process environment.
* **Inputs**: `process.env` properties.
* **Outputs**: Strongly-typed configuration object or process termination with errors.
* **Dependencies**: Zod validation library.
* **Flow**:
  1. Application starts.
  2. Parse variables using schema rules: `const env = envSchema.parse(process.env)`.
  3. If invalid: prints validation errors, calls `process.exit(1)`.
  4. If valid: binds strongly-typed variables globally.
* **Success Criteria**: Application boot fails immediately if variables are missing.
* **Failure Modes**: Misconfigured env variables preventing builds.
* **Trade-offs**: Requires keeping validation configurations synchronized.
* **Limitations**: Server-only values must be hidden from client bundles.
* **Repository Evidence**: Express backend configuration validations.
* **Related Standards**: [CONFIGURATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/CONFIGURATION.md).
* **Related Architecture**: [ARCHITECTURAL_PRINCIPLES.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/ARCHITECTURAL_PRINCIPLES.md).
* **Related Domains**: [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/README.md).
* **Related ADRs**: [ADR-002](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Accessing `process.env` directly throughout components without validations.
* **Examples**:
  ```ts
  import { z } from 'zod';

  const envSchema = z.object({
    PORT: z.string().transform(Number),
    DATABASE_URL: z.string().url(),
  });

  export const env = envSchema.parse(process.env);
  ```
* **Verification Checklist**:
  - [x] Application boot halts on missing fields.
  - [x] Variables are strongly typed.
