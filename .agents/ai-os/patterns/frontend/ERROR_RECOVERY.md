---
title: AI Operating System — Error Recovery Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Error Recovery Pattern

* **Pattern ID**: PAT-FE-002
* **Name**: Error Recovery hard reload
* **Purpose**: Guarantees users can recover from rendering crashes by performing native browser page-level reloads.
* **Problem Solved**: Next.js client-side routing performs soft layout transitions. If a component crash corrupts the browser state, soft links (`<Link>`) fail to clear the crash state, trapping users in the crash view.
* **Applicability**: Component-level and layout-level Error Boundaries (`error.tsx`, `global-error.tsx`).
* **Prerequisites**: React Error Boundary configurations.
* **Responsibilities**: Provides hard reload buttons using native anchors.
* **Participants**: Next.js Error Layouts.
* **Inputs**: Client errors.
* **Outputs**: Hard reload request.
* **Dependencies**: Next.js 15.
* **Flow**:
  1. Component crashes -> layout catches error, renders `error.tsx` fallback.
  2. Fallback provides native `<a>` anchor pointing to dashboard or homepage.
  3. Clicking native anchor performs full HTTP request, resetting browser memory.
* **Success Criteria**: App recovers cleanly to active homepage.
* **Failure Modes**: Soft router transitions causing permanent loops.
* **Trade-offs**: Slightly slower transition speed compared to client links.
* **Limitations**: Clears transient client memory state.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` line 25).
* **Related Standards**: [NEXTJS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NEXTJS.md#STD-NXT-001).
* **Related Architecture**: [COMPONENTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/COMPONENTS.md).
* **Related Domains**: [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/README.md).
* **Related ADRs**: [ADR-009](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Using Next.js `import Link from 'next/link'` in crash layouts.
* **Examples**:
  ```tsx
  export default function ErrorBoundary({ error, reset }: { error: Error, reset: () => void }) {
    return (
      <div>
        <h2>App Crashed!</h2>
        <button onClick={reset}>Try Soft Reset</button>
        <a href="/dashboard">Enforce Hard Reload</a>
      </div>
    );
  }
  ```
* **Verification Checklist**:
  - [x] Fallback layout uses native `<a>` element for critical redirection paths.
  - [x] Linter bypasses page anchor checks for page boundaries.
