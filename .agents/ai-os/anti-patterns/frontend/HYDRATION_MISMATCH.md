---
title: AI Operating System — Hydration Mismatch Anti-Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/anti-patterns/README.md
supersedes: []
---

# Hydration Mismatch Anti-Pattern

* **Anti-Pattern ID**: ANT-FE-001
* **Name**: Unguarded Browser-Only Globals Access
* **Category**: Frontend
* **Severity**: High
* **Problem**: Accessing browser-only parameters (like `window.innerWidth` or local storage objects) directly during the React render phase in Next.js client components.
* **Symptoms**: React console warnings: `Text content did not match. Server: "X" Client: "Y"` or page-load layout layout shift errors.
* **Why It Is Harmful**: Mismatches block Next.js client-side reconciliation. The browser is forced to discard the server-rendered DOM and rebuild it from scratch, degrading First Input Delay (FID) and page load speed.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` lines 14-18) turning off global restricted settings to let developers handle validations using hooks.
* **Related Standards**: [REACT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/REACT.md#STD-REC-001).
* **Related Architecture**: [COMPONENTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/COMPONENTS.md).
* **Related Pattern**: [HYDRATION_SAFETY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/frontend/HYDRATION_SAFETY.md).
* **Detection Method**:
  - **AI Check**: Scan components for references to `window`, `document`, or `localStorage` that are not wrapped inside `useEffect` callbacks or mount status hooks.
  - **Static Analysis**: Search for unrestricted globals calls.
* **Prevention Strategy**: Force developers to retrieve client-only data within `useEffect` hooks or standard custom hooks like `useMounted()`.
* **Refactoring Strategy**: Replace direct assignment references with mounting states check.
* **Verification Method**: build compiler validation and browser runtime check.
* **Exceptions**: Code running strictly inside click/change event handlers or `useEffect` blocks.
* **Examples**:
  ```tsx
  // BAD: Unguarded browser-only property access
  export function WidthBadge() {
    return <div>Viewport: {window.innerWidth}px</div>;
  }

  // GOOD: Guarded mount status access
  export function WidthBadge() {
    const isMounted = useMounted();
    if (!isMounted) return <div>Resolving layout...</div>;
    return <div>Viewport: {window.innerWidth}px</div>;
  }
  ```
