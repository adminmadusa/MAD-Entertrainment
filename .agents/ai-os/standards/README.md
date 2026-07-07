---
title: AI Operating System — Standards Layer Entry Point
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/FOUNDATION.md
supersedes: []
---

# Standards Layer (Engineering Standards SSOT)

Welcome to the Standards Layer of the AI Operating System. This layer acts as the canonical Single Source of Truth (SSOT) for engineering standards, coding conventions, testing patterns, and CI/CD rules in the MAD Entertrainment monorepo.

These standards serve to enforce quality and structure in future AI capability implementations (Skills) and prompts.

## Directory Inventory

The Standards Layer contains the following documents:
- [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/README.md) — This entry point and inventory.
- [TYPESCRIPT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/TYPESCRIPT.md) — TypeScript type configurations, compilation setups, and any-rule.
- [REACT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/REACT.md) — React 19 rules, hooks, state patterns, and hydration safety.
- [NEXTJS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NEXTJS.md) — Next.js 15 App Router routing, data-fetching, and error boundaries.
- [NODE_EXPRESS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NODE_EXPRESS.md) — Express middleware routing, handlers, and asynchronous error boundaries.
- [API_DESIGN.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/API_DESIGN.md) — REST endpoints naming, request schemas, and Swagger contract standards.
- [DATABASE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DATABASE.md) — Mongoose schemas, transaction wrappers, and index policies.
- [VALIDATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/VALIDATION.md) — Payload validation standards using Zod schemas.
- [ERROR_HANDLING.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/ERROR_HANDLING.md) — Global error middleware, AppError models, and client boundaries.
- [LOGGING.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/LOGGING.md) — Pino JSON logger standards and contextual tracing.
- [TESTING.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/TESTING.md) — Unit testing with Vitest and E2E testing with Playwright.
- [SECURITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/SECURITY.md) — Auth checks, JWT validations, OTP hashing, and secrets guidelines.
- [PERFORMANCE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/PERFORMANCE.md) — Redis throttling, BullMQ concurrency, and preflight edge rewrites.
- [ACCESSIBILITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/ACCESSIBILITY.md) — HTML5 semantics, focus controls, and screen readers.
- [DEPENDENCY_MANAGEMENT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DEPENDENCY_MANAGEMENT.md) — Workspace links, overrides, and exceptions checking.
- [NAMING_CONVENTIONS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NAMING_CONVENTIONS.md) — File qualifiers and naming standards.
- [DOCUMENTATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DOCUMENTATION.md) — Markdown configurations and path check policies.
- [GIT_STANDARDS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/GIT_STANDARDS.md) — Branch MANAGEMENT and commit messages.
- [CI_CD.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/CI_CD.md) — CI compilation steps and PR quality gates.
- [CONFIGURATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/CONFIGURATION.md) — tsconfig base extends and workspace configurations.

## Precedence & Dependencies
All files in the Standards Layer are Tier 6 (Standards) artifacts. They depend on `FOUNDATION.md`, Repository Layer, Domain Layer, and Architecture Layer files. They must be referenced by validation scripts, skills, and prompts. If code execution contradicts these documentation specifications, these documents represent the authoritative target, and the code must be aligned.
