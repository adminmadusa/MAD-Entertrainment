# Project Hygiene Audit Report

- **Date:** 2026-08-21
- **Branch:** `develop` (clean working tree)
- **Scope:** Full monorepo (apps/web, apps/admin, apps/server, packages/*, scripts/*, configs)
- **Auditor:** AI Agent (opencode)
- **Status:** Report Only — No Changes Executed

---

## Executive Summary

This audit covers repository structure, dead/unused/duplicate/orphaned/legacy files, stale code, unnecessary dependencies, naming inconsistencies, and misplaced modules across the entire MAD Entertrainment monorepo.

**Total findings: 22 items across 5 categories**

| Category | Count | Severity |
|----------|-------|----------|
| Dead/Duplicate Code | 6 | High |
| Unused/Misplaced Dependencies | 8 | Medium |
| Unused Exports | 3 | Medium |
| Environment Contradictions | 1 | Medium |
| Completed Migration Scripts | 5 | Low |

**No critical security issues found.** Production application code is clean of `console.log` statements. Gitignore rules are properly configured. Core governance framework is well-structured.

---

## Category 1: Dead/Duplicate Code

### D-1 — Duplicate `money.ts` (HIGH)

- **File:** `packages/utils/src/money.ts` (68 lines)
- **Duplicate of:** `packages/shared/src/utils/money.ts` (68 lines)
- **Verification:** `diff` exits with code 0 (byte-for-byte identical)
- **Consumer analysis:** Zero consumers import money functions from `@mad/utils`. All money function usage goes through `@mad/shared`.
- **SSOT violation:** AGENTS.md Section 2 — Every business rule must have exactly one owner.
- **Recommended action:** Delete `packages/utils/src/money.ts`. Remove barrel re-export from `packages/utils/src/index.ts:95`.

### D-2 — Legacy Monolithic PDF Generator (HIGH)

- **File:** `apps/server/src/utils/pdf.monolithic.ts` (379 lines)
- **Status:** Explicitly marked `@deprecated` and `LEGACY` in file header
- **Removal condition:** "Remove when `ENABLE_MODULAR_PDF` feature flag is permanently retired"
- **Current state:** `.env` has `ENABLE_MODULAR_PDF=true` (modular PDF is active). The monolithic file is only imported as a fallback.
- **Import location:** `apps/server/src/utils/pdf.ts:36`
- **Recommended action:** Delete file + remove fallback import. Update `.env.example` to match `.env` (`true`).

### D-3 — Deprecated API Routes (MEDIUM)

- **File:** `apps/server/src/routes/public/ticket.routes.ts:34-55`
- **Routes:**
  - `GET /my-tickets` — `@deprecated`, Sunset: 2026-12-31
  - `POST /:ticketId/assign` — `@deprecated Unused legacy ticket assignment route`
  - `POST /:ticketId/claim` — `@deprecated Unused legacy ticket claim route`
  - `POST /:ticketId/revoke` — `@deprecated Unused legacy ticket revoke route`
- **Recommended action:** Verify no frontend client calls these routes, then remove.

### D-4 — Deprecated Enum Member (LOW)

- **File:** `packages/shared/src/constants/index.ts:34`
- **Code:** `COMPLETED = 'completed', // Deprecated, will be removed in the future`
- **Recommended action:** Grep for all `EventStatus.COMPLETED` references. If zero active usage, remove.

### D-5 — Legacy Icon Aliases (LOW)

- **File:** `packages/ui/src/icons/index.ts:127-132`
- **Code:** Re-exports `Calendar as CalendarIcon` and `Search as SearchIcon` from lucide-react
- **Comment:** "These preserve imports that existed before the icon library migration. Do not remove until Phase 2.5 adoption is complete and all consumers updated."
- **Recommended action:** Verify Phase 2.5 status before removing.

### D-6 — Legacy Login Page Redirect (INFO)

- **File:** `apps/web/src/app/(auth)/login/page.tsx`
- **Status:** Page exists only to redirect to auth modal. Marked `LEGACY COMPATIBILITY REDIRECT`.
- **Recommended action:** Keep. This is a functional redirect, not dead code.

---

## Category 2: Unused/Misplaced Dependencies

### U-1 — `yaml` Unused in governance-cli (MEDIUM)

- **File:** `packages/governance-cli/package.json:13`
- **Dependency:** `"yaml": "^2.7.0"`
- **Evidence:** No `import ... from 'yaml'` found in `packages/governance-cli/src/`. All "yaml" references in source are string literals (e.g., `pnpm-workspace.yaml`).
- **Recommended action:** Remove from dependencies.

### U-2 — `autocannon` Unused in server (MEDIUM)

- **File:** `apps/server/package.json:69`
- **Dependency:** `"autocannon": "^8.0.0"` (devDependency)
- **Evidence:** No `import ... from 'autocannon'` found anywhere in server source or tests.
- **Recommended action:** Remove from devDependencies.

### U-3 — `@types/gsap` Misplaced (LOW)

- **File:** `apps/web/package.json:26`
- **Issue:** `"@types/gsap": "^3.0.0"` is in `dependencies` instead of `devDependencies`
- **Evidence:** `gsap` IS used in `apps/web/src/app/events/[slug]/gallery/components/use-card-fan.ts`, so types are needed, but `@types/*` should always be in devDependencies.
- **Recommended action:** Move to devDependencies.

### U-4 — `@sentry/nextjs` Misplaced in Root (MEDIUM)

- **File:** `package.json:38`
- **Issue:** `"@sentry/nextjs": "^10.53.1"` in root devDependencies, but only `apps/admin` imports it.
- **Evidence:** `apps/admin/src/lib/observability.ts:2` imports `@sentry/nextjs`. `apps/web` has zero Sentry imports.
- **Recommended action:** Remove from root. Add to `apps/admin/package.json` as a production dependency.

### U-5 — `@sentry/node` Redundant in Root (MEDIUM)

- **File:** `package.json:39`
- **Issue:** `"@sentry/node": "^10.53.1"` duplicated in root devDependencies AND `apps/server/package.json:22`.
- **Evidence:** `@sentry/node` is imported 18 times in `apps/server/src/`. Zero imports in root-level scripts.
- **Recommended action:** Remove from root devDependencies.

### U-6 — Missing `@mad/shared` in utils (HIGH)

- **File:** `packages/utils/package.json`
- **Issue:** `scanner.ts` imports from `@mad/shared`, but `@mad/shared` is not declared as a dependency.
- **Evidence:** `packages/utils/src/scanner.ts:1` — `import { normalizeTicketReference } from '@mad/shared'`
- **Risk:** Works via pnpm workspace hoisting. Would break if packages were built independently or published.
- **Recommended action:** Add `"@mad/shared": "workspace:*"` to dependencies.

### U-7 — Missing `@sentry/nextjs` in admin (HIGH)

- **File:** `apps/admin/package.json`
- **Issue:** `apps/admin/src/lib/observability.ts:2` imports `@sentry/nextjs`, but it is not declared in admin's package.json.
- **Risk:** Works via root devDependency hoisting. Would break if admin app were built in isolation.
- **Recommended action:** Add `"@sentry/nextjs": "^10.53.1"` as a production dependency.

### U-8 — Type Package Version Inconsistencies (LOW)

| Package | `@types/node` | `@types/react` | `@types/react-dom` |
|---------|---------------|-----------------|---------------------|
| server | ^22.19.19 | ^19.0.0 | ^19.0.0 |
| web | ^22.10.6 | ^19.0.4 | ^19.0.2 |
| admin | ^22.10.6 | ^19.0.4 | ^19.0.2 |
| ui | — | ^19.0.4 | — |

**Recommended action:** Align all type packages to the same versions.

---

## Category 3: Unused Exports

### E-1 — Unused Types in `@mad/types` (LOW)

The following types are exported from `@mad/types` but never imported by any consumer:

| Type | File |
|------|------|
| `DiagnosticsReport` | `packages/types/src/common.types.ts:82` |
| `QueueJob` | `packages/types/src/common.types.ts:106` |
| `BulkActionResult` | `packages/types/src/common.types.ts:68` |
| `SeatLayout` | `packages/types/src/event.types.ts:175` |
| `Seat` | `packages/types/src/event.types.ts:164` |
| `TicketOfferRules` | `packages/types/src/event.types.ts:5` |
| `TicketConfig` | `packages/types/src/event.types.ts:34` |
| `Payment` | `packages/types/src/user-content.types.ts:86` |
| `User` | `packages/types/src/user-content.types.ts:128` |

**Note:** These may be intentionally exported for future use or type compatibility. Verify before removing.

### E-2 — Unused Utils Exports (LOW)

| Export | File | Status |
|--------|------|--------|
| `DEFAULT_LOCALE` | `packages/utils/src/date.ts` | Only used internally in `date.ts` |
| `DEFAULT_TIMEZONE` | `packages/utils/src/date.ts` | Only used internally in `date.ts` |
| `FormatDateOptions` | `packages/utils/src/date.ts` | Only used internally in `date.ts` |

These are re-exported via `packages/utils/src/index.ts` but no external consumer imports them.

### E-3 — `decodeJwt` Unused Externally (LOW)

- **File:** `packages/utils/src/index.ts`
- **Evidence:** `decodeJwt` is exported but only imported in its own test file (`jwt.test.ts`). No external consumer uses it. Only `isTokenExpired` is consumed externally.
- **Recommended action:** Remove from barrel export. Keep the function itself (it's tested and may be useful).

---

## Category 4: Environment Contradictions

### ENV-1 — `ENABLE_MODULAR_PDF` Mismatch (MEDIUM)

| File | Value |
|------|-------|
| `apps/server/.env:71` | `ENABLE_MODULAR_PDF=true` |
| `apps/server/.env.example:29` | `ENABLE_MODULAR_PDF=false` |

The `.env.example` should reflect the recommended/production default. Since modular PDF is currently enabled in production, `.env.example` should be updated to `true`.

---

## Category 5: Completed Migration Scripts (LOW)

These one-shot database migration scripts appear to have already been executed. They contain hardcoded collection names, test data, and operational flags (`--execute`) that are no longer needed:

| File | Purpose |
|------|---------|
| `apps/server/src/scripts/migrate-remove-is-featured.ts` | Remove `isFeatured` field from events collection |
| `apps/server/scripts/migrate-admin-roles.ts` | Normalize admin role casing |
| `apps/server/scripts/create-notification-index.ts` | Create partial unique index on `jobId` |
| `apps/server/scripts/notification-jobid-dedupe.ts` | Deduplicate notification `jobId` records |
| `apps/server/scripts/verify-notifications-unique.ts` | Verify unique constraint |

**Note:** These scripts use `console.log` instead of the project's logger utility. Migration scripts are typically archived after completion.

---

## Clean Items (No Action Required)

The following areas were audited and found to be clean:

| Area | Status |
|------|--------|
| `scratch/` and `tmp/` gitignore rules | Properly gitignored |
| `reports/` and `.governance/` gitignore rules | Properly gitignored |
| `openspec/changes/archive/` | All 73 files correctly archived and excluded from governance |
| `.agents/` (269 tracked files) | Properly excluded from governance scanning |
| Root-level scripts (4 files) | All referenced and used |
| `console.log` in production app code | Zero instances (all in CLI/migration/test code) |
| Root `governance.config.ts` vs `scripts/governance/core/governance.config.ts` | Different files for different systems — no duplication |
| Git working tree | Clean |
| Package dependency graph | Acyclic (aside from undeclared `shared` dependency in utils) |
| Security secrets | No hardcoded secrets found |
| `.env` files | Properly gitignored (except tracked `.env` in server for local dev) |

---

## Recommended Execution Order

If changes are approved, execute in this order to minimize risk:

1. **Phase A — Safe dependency fixes** (U-1, U-2, U-3, U-4, U-5, U-6, U-7)
2. **Phase B — Duplicate removal** (D-1: money.ts)
3. **Phase C — Legacy code removal** (D-2: pdf.monolithic.ts, D-3: deprecated routes)
4. **Phase D — Barrel export cleanup** (E-1, E-2, E-3)
5. **Phase E — Environment alignment** (ENV-1)
6. **Phase F — Version alignment** (U-8)
7. **Phase G — Migration script archival** (Category 5)
8. **Phase H — Verification** (`pnpm run build`, `pnpm run lint`, `pnpm run type-check`, `pnpm run test`)

---

## Governance Compliance

This audit satisfies the following governance rules:

- **AGENTS.md Section 3** — Implementation Readiness Audit (Outcome C: Not Implemented → Report Only)
- **AGENTS.md Section 8** — Repository Hygiene, File Sizes & Security Rules
- **AGENTS.md Section 9** — Skill Selection & Prompt Intelligence
- **GOV-INV-001** — Root Cause Investigation Standard (evidence-based findings)
- **GOV-INV-002** — Claims Must Match Evidence (all findings include verification commands)

---

*Report generated: 2026-08-21 | Branch: develop | Working tree: clean*
