---
title: External Reference — React Framework
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/knowledge/frameworks/README.md
supersedes: []
---

# React Reference Document

## Purpose
Provides reference details on React rendering lifecycles, virtual DOM hydration, and Hook states management.

## Scope
Includes React Core rules, rendering optimizations, state transitions, and hooks behavior. Excludes MAD Entertrainment components and application layout logic.

## Concepts
- **Virtual DOM Hydration**: The process where client-side React attaches event handlers to pre-rendered HTML sent by SSR.
- **Rendering Lifecycle**: Mount, Update, and Unmount phases.
- **Hook Rules**: Hooks must be called at the top level and only from React function components.

## Common Problems
- Hydration Mismatch: Differing initial HTML on server and client.
- Stale Closures: Hook functions retaining old variables lists.

## Recommended Practices
- Guarantees window or localStorage calls are executed inside `useEffect` or client-side checks to prevent mismatch.

## Anti-Patterns
- Calling hooks conditionally or inside loop blocks.

## References
- Official React Docs (https://react.dev)

## Related AI OS Layers
- **Standards**: [REACT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/REACT.md)
- **Patterns**: [HYDRATION_SAFETY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/frontend/HYDRATION_SAFETY.md)
- **Validators**: [REACT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/validation/validators/REACT.md)
