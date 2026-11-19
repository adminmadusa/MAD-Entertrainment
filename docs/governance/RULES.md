# MAD Entertrainment Governance Rules Catalog

- **Owner**: Repository Governance Owner
- **Status**: Active
- **Version**: 2.0
- **Scope**: Repository-Wide Static Analysis & Governance Validation
- **Related Documents**: [AGENTS.md](../../AGENTS.md), [REPOSITORY_GOVERNANCE.md](../../REPOSITORY_GOVERNANCE.md)

---

## 1. Overview
This document is the canonical reference catalog for all automated governance and quality validation rules executed by `scripts/governance/index.ts` during pre-merge and CI quality gating.

---

## 2. Rule Categories & Definitions

### 2.1 Architecture Governance (`VAL-ARC-*`)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `VAL-ARC-001` | Observability Isolation | ERROR | Ensures observability, monitoring, and APM libraries are decoupled from business logic and controllers. |
| `VAL-ARC-002` | DTO Governance (Axios Import Block) | ERROR | Forbids direct Axios imports in presentation components; requires typed service wrappers and API clients. |
| `VAL-ARC-003` | App Router Layout Safety | ERROR | Validates layout and template structures in Next.js App Router to prevent cascading re-renders. |
| `VAL-ARC-004` | Validation Drift Prevention | ERROR | Ensures Zod validation schemas are shared across frontend and backend via `@mad/validations`. |
| `VAL-ARC-005` | Circular Import Detection (Critical) | ERROR | Fails build if direct or indirect circular package dependencies exist across monorepo boundaries. |
| `VAL-ARC-005b` | Circular Import Detection (Warning) | WARNING | Warns when circular import candidates are identified within isolated feature modules. |
| `VAL-ARC-006` | Deep Import Restriction | ERROR | Prohibits importing internal files across packages (e.g., must import from `@mad/ui`, not `@mad/ui/src/primitives/Button`). |
| `VAL-ARC-007` | Barrel File API Surface Governance | ERROR | Ensures barrel files (`index.ts`) only export intentional public API surfaces without leaking internal utilities. |
| `VAL-ARC-008` | Expired Deprecation / Sunset Header | ERROR | Fails build if deprecated endpoints or utilities past their `sunset` date are still referenced. |

---

### 2.2 Code Quality & Complexity Limits (`VAL-QUAL-*`)

| Rule ID | Metric / Target | Ceiling | CI Action | Purpose |
|---|---|---|---|---|
| `VAL-QUAL-001` | UI Component File Size | 300 lines | `FAIL_BUILD` | Prevents monolithic UI components; forces composition. |
| `VAL-QUAL-002` | Custom Hook File Size | 250 lines | `FAIL_BUILD` | Keeps React hooks focused on single concerns. |
| `VAL-QUAL-003` | Controller File Size | 200 lines | `FAIL_BUILD` | Keeps Express controllers thin; business logic belongs in services. |
| `VAL-QUAL-004` | Backend Service File Size | 500 lines | `FAIL_BUILD` | Enforces service decomposition. |
| `VAL-QUAL-005` | Schema / Types File Size | 300 lines | `FAIL_BUILD` | Encourages domain-partitioned schemas. |
| `VAL-QUAL-006` | Test Suite Partitioning | 800 lines | `FAIL_BUILD` | Tests must be split by domain/behavior, not piled into one file. |
| `VAL-QUAL-007` | Cyclomatic Complexity | 15 | `WARN` | Highlights convoluted nested branches. |
| `VAL-QUAL-008` | State / Effect Overload | 10 hooks | `WARN` | Warns if a component declares > 10 `useState`/`useEffect` hooks. |

---

### 2.3 UI & Design System Governance (`VAL-UI-*`)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `VAL-UI-001` | Modal Backdrop Consistency | WARNING | Enforces standard styling for modal overlay backdrop filters. |
| `VAL-UI-002` | Shared Modal Component Usage | WARNING | Ensures modal implementations consume the shared `@mad/ui` Modal. |
| `VAL-UI-003` | Modal Accessibility Semantics | ERROR | Enforces `role="dialog"`, `aria-modal="true"`, and focus trapping. |
| `VAL-UI-004` | Table Abstraction Check | WARNING | Enforces using `@mad/ui` Table instead of raw `<table>` HTML elements. |
| `VAL-UI-005` | Button Styling Check | WARNING | Enforces `@mad/ui` Button over custom button CSS classes. |
| `VAL-UI-006` | Field Layout Wrapper Check | WARNING | Requires FormField wrappers around inputs for accessible labels. |
| `VAL-UI-007` | Design Token Usage | WARNING | Blocks hardcoded hex colors; requires CSS custom properties (`--color-*`). |
| `VAL-UI-008` | Heading Hierarchy | WARNING | Validates semantic heading structure (`h1` $\to$ `h2` $\to$ `h3`). |
| `VAL-UI-009` | Interactive Element Touch Target | ERROR | Requires minimum `44px × 44px` touch targets for interactive controls. |
| `VAL-UI-010` | Shared Component Enforcement | WARNING | Detects raw HTML tags where shared primitives exist. |
| `VAL-UI-011` | Duplicate Component Layout | WARNING | Flags near-identical component layouts across different apps. |
| `VAL-UI-012` | Dead Component Detection | WARNING | Flags unimported and unreferenced React components. |
| `VAL-UI-013` | Dead Hook Detection | WARNING | Flags unimported custom React hooks. |
| `VAL-UI-014` | Dead Utility File Detection | WARNING | Flags unimported helper utility modules. |
| `VAL-UI-015` | Dead Asset (Image/Icon) | WARNING | Identifies unused static media in `public/` directories. |
| `VAL-UI-016` | Dead Style File | WARNING | Identifies unused CSS/SCSS modules. |
| `VAL-UI-017` | Safe Delete Verification | WARNING | Pre-deletion safety verification check. |
| `VAL-UI-018` | Possible Unreachable Route | WARNING | Identifies App Router pages with broken links or no parent navigation. |
| `VAL-UI-019` | Duplicate File Contents | WARNING | Detects byte-for-byte duplicate code files across packages. |
| `VAL-UI-020` | Alt Text Missing | ERROR | Requires descriptive `alt` attribute on all `<img>` and Next.js `<Image>` tags. |
| `VAL-UI-021` | Image Missing Dimensions | ERROR | Requires explicit `width` and `height` to prevent Cumulative Layout Shift (CLS). |
| `VAL-UI-022` | Hardcoded Inline Color | WARNING | Blocks inline `style={{ color: '#...' }}`. |
| `VAL-UI-023` | Overflow-X Hidden on Root | WARNING | Prevents horizontal scrolling on mobile viewports (320px–375px). |
| `VAL-UI-024` | Arbitrary Tailwind Spacing | WARNING | Enforces standard Tailwind spacing scale over arbitrary values like `p-[13px]`. |
| `VAL-UI-025` | Duplicate Tailwind Utilities | WARNING | Flags redundant conflicting utility classes in `className`. |

---

### 2.4 User Experience & Required States (`VAL-UX-*`)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `VAL-UX-001` | Missing Loading State | ERROR | Every asynchronous data container must render a skeleton or spinner while fetching. |
| `VAL-UX-002` | Missing Empty State | ERROR | Data lists and collections must provide a user-friendly empty state when `data.length === 0`. |
| `VAL-UX-003` | Missing Error State | ERROR | API queries must render an error fallback container with retry capability. |

---

### 2.5 Security & Authorization (`VAL-SEC-*`)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `VAL-SEC-001` | Secure Upload Handling | ERROR | Validates MIME type, file size ceilings, and sanitization for user file uploads. |
| `VAL-SEC-002` | RBAC Authorization Check | ERROR | Ensures admin routes and mutations enforce server-side role verification. |
| `VAL-DOC-005` | Secret & Credential Detection | ERROR | Scans codebase for committed API keys, tokens, JWT secrets, and connection strings. |

---

### 2.6 Performance Governance (`VAL-PFM-*`)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `VAL-PFM-001` | Optimize Font Loading | WARNING | Enforces Next.js `next/font` with `display: swap` to prevent FOIT/FOUT. |
| `VAL-PFM-002` | Avoid Render-Blocking Imports | WARNING | Flags heavy third-party bundles imported synchronously in root layouts. |

---

### 2.7 Documentation Governance (`VAL-DOC-*`)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `VAL-DOC-001` | Local Workstation Path Detection | ERROR | Forbids workstation-specific local directory paths in documentation. |
| `VAL-DOC-002` | Absolute Filesystem Path Detection | ERROR | Requires repository-relative links instead of drive-absolute paths. |
| `VAL-DOC-003` | Broken Link Target Detection | ERROR | Validates that all markdown relative links point to existing files on disk. |
| `VAL-DOC-004` | Case-Sensitive Filename Casing | ERROR | Ensures link casing matches exact filesystem casing (prevents macOS/Linux drift). |
| `VAL-DOC-005` | Missing SSOT Document | ERROR | Verifies the existence of all 10 mandatory root SSOT documents. |
| `VAL-DOC-006` | Duplicate Document Detection | WARNING | Flags duplicate documentation covering identical topics. |
| `VAL-DOC-007` | Reachability-Based Orphan Detection | WARNING | Ensures every active documentation file is reachable from an entrypoint. |
| `VAL-DOC-008` | Document Lifecycle Validation | WARNING | Validates ownership metadata blocks, last updated dates, and review SLAs. |

---

### 2.8 Repository Hygiene (`VAL-HYG-*`)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `VAL-HYG-001` | Import Ordering & Grouping | WARNING | Enforces imports order: Built-ins $\to$ External $\to$ Workspace Aliases $\to$ Relative $\to$ Side-effects. |
| `VAL-HYG-002` | Duplicate Imports Detection | ERROR | Blocks multiple import statements from the same module. |
| `VAL-HYG-003` | Type Imports Enforcement | WARNING | Requires `import type { ... }` for pure TypeScript type imports. |
| `VAL-HYG-004` | Trailing Whitespace Detection | ERROR | Forbids trailing spaces at ends of lines. |
| `VAL-HYG-005` | EOF Newline Enforcement | ERROR | Every file must terminate with exactly one trailing newline character. |
| `VAL-HYG-006` | Excessive Blank Lines Collapse | WARNING | Forbids consecutive multiple empty blank lines. |
| `VAL-HYG-007` | TODO Inventory Consistency | WARNING | Validates TODO comments conform to tracked task formatting. |
| `VAL-HYG-008` | Protected Branch Modification | ERROR | Forbids direct commits to `develop` or `live`. |
| `VAL-HYG-009` | Tracked Build Output in Source | ERROR | Forbids tracked `dist/`, `.next/`, or generated artifacts in source control. |
| `VAL-HYG-010` | Tracked Bytecode & Generated Noise | ERROR | Forbids tracked `*.pyc`, `__pycache__`, or temp files. |
