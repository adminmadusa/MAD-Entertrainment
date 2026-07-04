---
title: AI Operating System — Hydration Safety Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Hydration Safety Pattern

* **Pattern ID**: PAT-FE-001
* **Name**: Hydration Safety Guard
* **Purpose**: Prevents React hydration mismatch errors when rendering client-specific browser parameters.
* **Problem Solved**: React SSR generates static HTML on the server. If client-specific values (like window widths or local storage content) are injected directly into rendering cycles, the client-rendered output differs from the server-rendered HTML, prompting hydration warnings.
* **Applicability**: All client components rendering content conditional on client-only values (e.g. dynamic layout resizing, local storage configurations).
* **Prerequisites**: Custom hydration status hook (e.g. `useMounted`).
* **Responsibilities**: Ensures render-safe outputs for server compiles, transitioning dynamically upon client mount.
* **Participants**: React client components, custom hydration hooks.
* **Inputs**: Dynamic browser globals (e.g. `window.innerWidth`).
* **Outputs**: Server-rendered fallback tags -> client-rendered browser parameters.
* **Dependencies**: React 19.
* **Flow**:
  1. Component renders on server: returns static fallback.
  2. Component mounts on client: triggers useEffect, sets mounted state to true.
  3. Component re-renders on client: safely injects window values.
* **Success Criteria**: Compile completes without hydration console warnings.
* **Failure Modes**: Missing mount guards causing page-load visual flickering.
* **Trade-offs**: Slightly delayed rendering of client-only UI sections.
* **Limitations**: Server builds display fallback placeholders during initial load.
* **Repository Evidence**: ESLint config rules allowing guarded access (`eslint.config.mjs` lines 14-18).
* **Related Standards**: [REACT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/REACT.md#STD-REC-001).
* **Related Architecture**: [COMPONENTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/COMPONENTS.md).
* **Related Domains**: [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/README.md).
* **Related ADRs**: [ADR-002](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Unconditional access to `window` inside client component render methods.
* **Examples**:
  ```tsx
  import { useMounted } from '@/hooks/useMounted';

  export function WindowWidthIndicator() {
    const isMounted = useMounted();
    if (!isMounted) return <div>Loading layout...</div>;
    return <div>Screen Width: {window.innerWidth}px</div>;
  }
  ```
* **Verification Checklist**:
  - [x] Component uses `useMounted()` guard.
  - [x] Server-side render passes with mock data.
  - [x] Linter does not complain.
