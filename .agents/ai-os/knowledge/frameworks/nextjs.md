---
title: External Reference — NextJS Framework
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/knowledge/frameworks/README.md
supersedes: []
---

# NextJS Reference Document

## Purpose
Provides reference details on NextJS App Router, route execution contexts, and static generation.

## Scope
NextJS standard Router structures, Error boundary layouts, and environment variables access. Excludes MAD Entertrainment routes and configuration setups.

## Concepts
- **App Router**: Dynamic filesystem-based router utilizing Server Components.
- **Static vs. Dynamic Rendering**: Server-side pre-compilation vs. runtime request-time generation.
- **Link Component**: Client-side navigational preload wrappers.

## Common Problems
- Layout Reload loop: Layout components re-rendering completely during route error boundaries fallback.
- Client-side variables leaks: Bypassing `NEXT_PUBLIC_` namespace.

## Recommended Practices
- Uses native HTML links (`<a>`) inside layout level error pages to trigger complete route reloads instead of client Link hooks.

## Anti-Patterns
- Nesting NextJS client Links inside root error recovery blocks.

## References
- NextJS App Router Docs (https://nextjs.org/docs)

## Related AI OS Layers
- **Standards**: [NEXTJS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NEXTJS.md)
- **Patterns**: [ERROR_RECOVERY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/frontend/ERROR_RECOVERY.md)
- **Validators**: [NEXTJS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/validation/validators/NEXTJS.md)
