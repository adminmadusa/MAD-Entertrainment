---
title: External Reference — NextJS Upgrade Migration
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/knowledge/migration-guides/README.md
supersedes: []
---

# NextJS Upgrade Migration Reference

## Purpose
Provides reference workflows for NextJS major framework upgrades (e.g. migrating from Page router to App Router).

## Scope
General route mappings conventions, context providers wrappers migrations, and API routes refactoring patterns. Excludes MAD Entertrainment business code.

## Concepts
- **App Router Migration**: Transitioning pages from `/pages` to `/app` structure.
- **Server Components Integration**: Separating server-side fetch from interactive client rendering.

## Common Problems
- Route conflicts: Multiple routers active simultaneously.
- Hook exceptions: Invoking `useRouter` from next/router in Server Components.

## Recommended Practices
- Upgrades routes iteratively component-by-component, prioritizing static layout contexts.

## Anti-Patterns
- Migrating entire directories at once without executing local unit verification suites.

## References
- NextJS Migration Guide (https://nextjs.org/docs/app/building-your-application/upgrading)

## Related AI OS Layers
- **Standards**: [NEXTJS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NEXTJS.md)
- **Validators**: [NEXTJS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/validation/validators/NEXTJS.md)
