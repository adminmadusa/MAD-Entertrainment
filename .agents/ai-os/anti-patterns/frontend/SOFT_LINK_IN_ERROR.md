---
title: AI Operating System — Soft Link in Error Boundaries
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/anti-patterns/README.md
supersedes: []
---

# Soft Link in Error Boundaries

* **Anti-Pattern ID**: ANT-FE-002
* **Name**: Next.js client-side Link in Crash Layouts
* **Category**: Frontend
* **Severity**: Medium
* **Problem**: Importing and utilizing Next.js `Link` components (`import Link from 'next/link'`) inside page-level error boundaries or global layout error handlers.
* **Symptoms**: Clicking the reload redirection path link updates the browser URL but fails to reset the crashed screen layout.
* **Why It Is Harmful**: Next.js `<Link>` elements perform soft client-side transitions. They bypass browser-level reloads and preserve the active React state hierarchy. If a component crash corrupts the layout memory, a soft navigation path will lock the user in the crashed interface state.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` line 25: `@next/next/no-html-link-for-pages` is disabled to allow hard HTML anchors in error layouts).
* **Related Standards**: [NEXTJS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/NEXTJS.md#STD-NXT-001).
* **Related Architecture**: [COMPONENTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/COMPONENTS.md).
* **Related Pattern**: [ERROR_RECOVERY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/frontend/ERROR_RECOVERY.md).
* **Detection Method**:
  - **AI Check**: Scan files matching `**/error.tsx` or `**/global-error.tsx` for occurrences of `Link` from `'next/link'`.
  - **Static Analysis**: Search for Next.js imports inside error layout scopes.
* **Prevention Strategy**: Force error boundaries to redirect using native HTML `<a>` tags.
* **Refactoring Strategy**: Swap `<Link href="/url">` with `<a href="/url">`.
* **Verification Method**: Code review.
* **Examples**:
  ```tsx
  // BAD: Soft Link component in error layout
  import Link from 'next/link';
  export default function ErrorPage() {
    return <Link href="/">Back to Dashboard</Link>;
  }

  // GOOD: Native HTML anchor to force full reload
  export default function ErrorPage() {
    return <a href="/">Back to Dashboard</a>;
  }
  ```
