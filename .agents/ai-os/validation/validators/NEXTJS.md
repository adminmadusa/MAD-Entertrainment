---
title: AI Operating System — Next.js Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Next.js Validator

* **Purpose**: Enforces Next.js App Router conventions and validates page anchor types in error handlers.
* **Scope**: apps/web and apps/admin client codebases.
* **Inputs**: Component layouts and routing modules.
* **Outputs**: Next.js route violations.
* **Required Knowledge Layers**: Standards (NextJS), Patterns (Error Recovery).
* **Detection Strategy**: Scans layout and error page dependencies for Link imports and native anchor tags.
* **Rule IDs**: VAL-NXT-001 (client Link in error boundary layouts).
* **Severity Levels**: HIGH (navigation lock).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: Yes (swap Link with native `<a>` tags inside error boundaries).
* **False Positive Risks**: Zero.
* **Dependencies**: TypeScript AST compiler.
* **Related Standards**: [NEXTJS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NEXTJS.md).
* **Related Patterns**: [ERROR_RECOVERY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/frontend/ERROR_RECOVERY.md).
* **Related Anti-Patterns**: [SOFT_LINK_IN_ERROR.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/frontend/SOFT_LINK_IN_ERROR.md).
* **Related Governance Rules**: [CODE_REVIEW.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/CODE_REVIEW.md).
