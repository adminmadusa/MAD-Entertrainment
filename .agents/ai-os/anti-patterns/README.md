---
title: AI Operating System — Anti-Patterns Library Entry Point
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/FOUNDATION.md
supersedes: []
---

# Anti-Patterns Library

Welcome to the Anti-Patterns Library of the AI Operating System. This library serves as the Single Source of Truth (SSOT) for prohibited or discouraged engineering practices inside the MAD Entertrainment repository.

These anti-patterns document common coding pitfalls and architectural violations to guide static analysis tools, code reviews, and future AI code generation (Skills).

## Directory Inventory

The Anti-Patterns Library contains the following documents:
- [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/README.md) — This entry point and inventory.
- [frontend/HYDRATION_MISMATCH.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/frontend/HYDRATION_MISMATCH.md) — Unguarded client-only parameter rendering.
- [frontend/SOFT_LINK_IN_ERROR.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/frontend/SOFT_LINK_IN_ERROR.md) — Soft Next.js client links inside layouts error boundaries.
- [backend/MISSING_TRANSACTION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/backend/MISSING_TRANSACTION.md) — Multi-collection writes lacking atomic session boundaries.
- [database/AUTOINDEX_IN_PROD.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/database/AUTOINDEX_IN_PROD.md) — AutoIndex enabled on production schemas.
- [performance/MATH_RANDOM_IDS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/performance/MATH_RANDOM_IDS.md) — Using Math.random for security keys or identifiers.
- [security/PRODUCTION_MOCK_PAYMENT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/security/PRODUCTION_MOCK_PAYMENT.md) — Allowing test checkout tokens to process in live builds.

## Precedence & Dependencies
All files in the Anti-Patterns Library are Tier 7 (Anti-Patterns) artifacts. They depend on `FOUNDATION.md`, Repository Layer, Domain Layer, Architecture Layer, Standards Layer, and Pattern Library files. They must be referenced by validation scripts, skills, and prompts. If code execution contradicts these documentation specifications, these documents represent the authoritative target, and the code must be aligned.
