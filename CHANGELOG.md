# Repository Changelog

- **Owner**: Repository Governance Owner & Maintainers
- **Status**: Active
- **Version**: 1.0
- **Review Cycle**: Ongoing (Upon each release)
- **Last Updated**: 2026-07-03
- **Changelog Format**: Keep a Changelog v1.0.0
- **Versioning Strategy**: Semantic Versioning (SemVer) v2.0.0
- **Related Documents:**
  - [README.md](README.md)
  - [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md)
  - [RUNBOOK.md](RUNBOOK.md)
  - [ARCHITECTURE.md](ARCHITECTURE.md)
  - [DEPLOYMENT_MAP.md](DEPLOYMENT_MAP.md)
  - [API_CONTRACTS.md](API_CONTRACTS.md)

---

## 1. Executive Overview

### Purpose
The `CHANGELOG.md` serves as the canonical history of all releases, architectural shifts, governance updates, and operational revisions in the MAD Entertrainment repository. It provides historical context on what was changed, when it was changed, and why it was changed. The document format is based on the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) specification, and version numbering adheres to the [Semantic Versioning](https://semver.org/spec/v2.0.0.html) standard.

### Scope & Audience
This log is intended for developers, platform operators, and automated auditing agents. It traces the timeline of repository updates in a structured, human-readable format.

### Relationship with SSOT Documents
While our core SSOT documents (`REPOSITORY_GOVERNANCE.md`, `ARCHITECTURE.md`, `DEPLOYMENT_MAP.md`, `API_CONTRACTS.md`) record the *current state* of our policies and configurations, `CHANGELOG.md` records the *incremental differences* and release milestones over time.

---

## 2. Changelog Policy

### Semantic Versioning (SemVer)
We follow Semantic Versioning (`MAJOR.MINOR.PATCH`) to number repository releases:
- **MAJOR**: Incompatible API contract changes, breaking architectural boundaries, or structural governance updates.
- **MINOR**: Backward-compatible feature additions, new endpoints, package additions, or supplementary SSOT updates.
- **PATCH**: Backward-compatible bug fixes, performance improvements, documentation clarifications, or dependency audits.

### Release Cadence & Process
- Changelog updates must occur in tandem with any release PR.
- Direct commits to protected branches (`develop` or `live`) are prohibited. Release tags are generated strictly from the approved `live` branch.

### Deprecation & Breaking Changes
- Obsolete endpoints, packages, or settings must be marked as `Deprecated` at least one minor release before their eventual code removal (`Removed`).

---

## 3. Release Categories

All changelog entries are grouped into the following standardized sections:
- **Added**: New features, endpoints, packages, or configurations.
- **Changed**: Updates to existing features, boundaries, or workflows.
- **Deprecated**: Impending removal of features, endpoints, or patterns.
- **Removed**: Deletion of features, endpoints, or legacy files.
- **Fixed**: Defect repairs or validation fixes.
- **Security**: Security patches, dependency vulnerability exception updates, or access audits.
- **Documentation**: Non-functional updates to SSOT files or guidelines.
- **Governance**: Updates to review policies, branch guidelines, or CI validation checkers.
- **Performance**: Enhancements to build times, execution speeds, or query efficiency.

---

## 4. Release Workflow

```mermaid
graph TD
    Dev["Developer Codes Feature"] --> Branch["Create task branch (feat/*, fix/*)"]
    Branch --> Test["Local Verification (lint, test, build)"]
    Test --> PR["Open Pull Request"]
    PR --> Review["Peer & Domain Owner Review"]
    Review --> Merge["Merge PR into develop branch"]
    Merge --> UpdateChange["Update CHANGELOG.md (Unreleased)"]
    UpdateChange --> Release["Merge develop into live & Create Version Tag"]
    Release --> Deploy["Auto-deploy to Production"]
```

---

## 5. Release Checklist

Every release must satisfy the following checklist before merge:
- [ ] Core verification tests pass (`pnpm lint`, `pnpm test`, `pnpm build`).
- [ ] Governance checks pass (`pnpm run audit-data`).
- [ ] ADR is created (if required by the Repository Governance SSOT).
- [ ] All modified SSOT documentation files are updated.
- [ ] `CHANGELOG.md` is updated with concise, structured entries under `[Unreleased]`.
- [ ] Version tag is updated upon merging into the production branch.

---

## 6. Version History

### [Unreleased]
*Planned or unreleased changes currently residing in the develop branch.*

---

### [@mad/ui v1.3.0] — Phase 2B: Shared Component Implementations — 2026-07-06

#### Added
- **22 core UI components** — implemented all planned primitives, composites, and layouts under `@mad/ui` with standard types, styling mappings, vitest specifications, and markdown contracts.
- **`vitest.workspace.ts` extension** — added `ui` project definition targeting `jsdom` testing environment to compile and execute UI components specifications.
- **`component-manifest.json` update** — baseline v1.3.0 registers all 22 components as `preview` with `since: "1.3.0"`.
- **`docs/design-system/releases/1.3.0.md`** — release notes detailing v1.3.0 deliverables.

#### Changed
- Root barrel (`packages/ui/src/index.tsx`) updated to export all new primitives, composites, and layouts.
- Marked `Textarea.tsx` with `"use client"` directive to support client state character counts within SSR boundaries.

---

### [@mad/ui v1.2.0] — Phase 2A: UI Package Infrastructure — 2026-07-06

#### Added
- **Package export map** — `package.json` `"exports"` field is now the authoritative public API surface for `@mad/ui`. Stable entry points: `@mad/ui`, `@mad/ui/icons`, `@mad/ui/styles/*`, `@mad/ui/themes/mad`, `@mad/ui/themes/default`, `@mad/ui/tailwind/preset`, `@mad/ui/testing`.
- **`lib/cn.ts`** — `clsx` + `tailwind-merge` class merging utility, exported via root barrel.
- **Icon library** (`@mad/ui/icons`) — `lucide-react` integrated as the canonical icon library. All icons re-exported through a single curated barrel. Backward-compat aliases for `CalendarIcon` and `SearchIcon` preserved.
- **Default theme** (`@mad/ui/themes/default`) — neutral dark palette implementing the full Theme Contract; starting point for future Esparex product themes.
- **Component folder hierarchy** — `src/primitives/`, `src/composites/`, `src/layouts/`, `src/internal/` directories established for Phase 2B component implementations.
- **`API_STABILITY.md`** — lifecycle states and breaking change policy for all components.
- **`THEME_CONTRACT.md`** — required CSS custom property specification every theme must implement.
- **`future-themes.md`** — planned theme roadmap (farmer, crm, portfolio) documented without creating empty placeholder folders.
- **ADR-001** through **ADR-004** — Architecture Decision Records explaining: UI package boundary, theme contract, public API freeze rule, component lifecycle model.
- **`docs/design-system/releases/1.2.0.md`** — detailed release notes for this version.
- **Component manifest generator** — `gather-ui-baseline.ts` extended to emit `component-manifest.json` (schema v1.1) alongside `ui-baseline.json`.

#### Changed
- `src/components/*.tsx` files converted to backward-compatible re-export shims pointing to new canonical locations in `primitives/`, `composites/`, `layouts/`. All existing imports unchanged.
- `packages/ui` version bumped: `1.1.0` → `1.2.0`.
- New dependencies added to `packages/ui`: `clsx@^2.1.1`, `tailwind-merge@^3.3.1`, `lucide-react@^0.511.0`.

#### Deprecated
None.

#### Removed
None.

---


### [v1.2.0] - 2026-07-04
*Completed Repository Governance Platform and automated Git Hygiene Engine. Completes Roadmap Phases 1–8.*

#### Added
- **Core Platform Contracts** (Phase 2) — codified frozen abstractions under `platform/contracts/` (`EngineContext`, `GovernanceProvider`, `GovernanceRule`, `Finding`, `CleanupAction`, `ReportModel`, `EventBroker`).
- **Platform Compatibility Tests** (Phase 2.5) — compatibility test suite verifying load-time capabilities, rule Registries, DAG dependency order, domain snapshots, and serialization.
- **Rules Engine** (Phase 3) — converted legacy analyzers to structured `GovernanceRule` classes (`BranchNamingRule`, `DuplicateTreeRule`, `IntegrationLagRule`, `OrphanedBranchRule`, `StaleBranchRule`).
- **Cleanup Planner** (Phase 4) — dynamic action planner with `GitCommandBuilder` to queue safe command-line remedies.
- **Historical Trend Engine** (Phase 5) — lightweight, git-independent trend logging with error boundaries and delta mapping.
- **Lifecycle State Machine** (Phase 6) — pure `LifecycleClassifier` mapping branches to enum lifecycle states (`ACTIVE`, `OPEN_PR`, `MERGED`, `DELETE_READY`, `STALE`, etc.) orthogonally to branch protection.
- **Manual Branch Review** (Phase 7) — dynamic review decisions generator saving audit decisions sheet to `.agents/branch_review_decisions.md` while preserving custom inputs on successive runs.
- **AI OS Stack Resolution** (Phase 8) — cascading safety pruning utility `prune-stack.ts` checking working tree cleanliness, evaluating verification gates, deleting merged branches safely, and writing a JSON audit trail log.
- `CONTRIBUTING.md` outlining the developer workflow, setup instructions, and quality checks.
- Structured issue templates for bugs, feature requests, governance updates, and questions.
- `PULL_REQUEST_TEMPLATE.md` enforcing the 11-question quality gate check.
- `CODEOWNERS` configuration mapping domain owners to repository paths.
- Repository-scoped AI Skills framework under `.agents/skills/` (governance audit, pr review, git workflow, documentation, and architecture review).

#### Changed
- Fixed ancestry/reachability check bug by correcting `runWithExitCode` to return numeric exit codes rather than booleans.
- Pinned TruffleHog Action in CI pipeline to a stable release version (`v3.95.7`).
- Renewed the expired vulnerability exception for `serialize-javascript` (valid until 2026-10-01).
- Corrected wrong paths and stale CI statements in `README.md` and `ROADMAP.md`.
- Added standard metadata block to `TODO-AUDIT-FIXES.md`.

### [v1.1.0] - 2026-07-03
*Completed Event Experience — Event Memories feature. PR [#439](https://github.com/adminmadusa/MAD-Entertrainment/pull/439). Release commit `79c15d00`.*

#### Added
- **Event Memories** — post-event content sub-document on the `Event` model, allowing administrators to attach a photo gallery, heading, thank-you message, and highlight copy to completed events.
- **`EventMemoryPublicationState` enum** (`packages/shared`) — four-state publication lifecycle: `DRAFT` → `PREVIEW` → `PUBLISHED` → `HIDDEN`.
- **`EventMemoryConfig` type** (`packages/types`) — shared TypeScript type used by all layers (server schema, admin form, public response).
- **`MAX_MEMORIES_GALLERY_LIMIT` constant** (50 items) and **`DEFAULT_MEMORIES_GALLERY_LIMIT`** (30 items) (`packages/shared`).
- **Admin API — Preview Token endpoint** — `POST /api/admin/events/:id/preview-token` generates a 15-minute short-lived JWT allowing admins to preview memories in `DRAFT` or `PREVIEW` state on the public event page without publishing.
- **Admin UI — EventMemoriesCard** (`apps/admin`) — full-featured admin component for composing and publishing event memories, including gallery management, publication state controls, and previewing.
- **Admin UI — Event Edit page** — integrated `EventMemoriesCard` into the event edit page (`apps/admin/src/app/events/[id]/edit/page.tsx`).
- **Public UI — EventMemoriesRecap** (`apps/web`) — component rendered on the public event detail page when memories are in `PUBLISHED` state.
- **Public UI — EventStickyCTA** updates — completed events suppress the "Buy Tickets" CTA; the sticky bar adapts to the `COMPLETED` event lifecycle status.
- **Database schema** — `eventMemorySchema` embedded sub-document added to the `Event` Mongoose model with fields: `publicationState`, `heading` (max 200 chars), `thankYouMessage` (max 2000 chars), `highlights` (string array), `gallery` (up to 50 Cloudinary assets with `order`), `publishedAt` (stable first-publish timestamp).

#### Changed
- **`PUT /api/admin/events/:id`** — extended request body to accept an optional `memories` sub-document. The `updateEvent` service enforces publication state transition rules, preserves the first `publishedAt` timestamp on subsequent publish operations, and cleans up removed Cloudinary gallery assets.
- **`GET /api/events/:slug`** — now serves both `PUBLISHED` and `COMPLETED` events so that completed event detail pages remain publicly accessible. Suppresses `memories` data unless `publicationState === PUBLISHED` or a valid preview token is provided.
- **`adminEventsQuerySchema` / `updateEventSchema`** — Zod validation extended to include the `eventMemorySchema` validator with `MAX_MEMORIES_GALLERY_LIMIT` enforcement, `order` field, and strict nullable/optional semantics.
- **Backend audit log** — transition-aware audit actions emitted on memory state changes: `event.memories.published`, `event.memories.hidden`, `event.memories.cleared`, `event.memories.updated`, `event.memories.preview.generated`, `event.memories.preview.accessed`.
- **`apps/server/src/services/admin/event.service.test.ts`** — extended with 15 new test cases covering Event Memories state transitions, preview token generation, and gallery cleanup.
- **`apps/server/src/services/public/event.service.test.ts`** — new test file (243 lines) covering public event retrieval including COMPLETED status, preview token validation, and memories suppression logic.

#### Documentation
- `API_CONTRACTS.md` updated with new Event Memories endpoints and preview token flow.
- `ARCHITECTURE.md` updated with Event Memories lifecycle and database schema additions.
- `RUNBOOK.md` updated with operational guidance for publishing Event Memories.
- `CHANGELOG.md` this entry.

---

### [v1.0.0] - 2026-06-25

*Initial repository documentation baseline establishing the monorepo's foundational architecture, APIs, deployment environments, and governance. This represents the post-cleanup documentation state, not the first production software release.*

#### Added
- `REPOSITORY_GOVERNANCE.md` (Governance SSOT defining roles, matrices, and branching/PR policies).
- `ARCHITECTURE.md` (Architecture SSOT defining package boundaries and coding standards).
- `DEPLOYMENT_MAP.md` (Deployment SSOT mapping hosting topology and environments).
- `API_CONTRACTS.md` (API SSOT detailing routes, validation schemas, and rate limits).
- `docs/decisions/` ADR framework with status lifecycles, Templates, and chronological Indices.
- `docs/decisions/ADR-001-booking-ownership.md` (Validating backend booking allocation).

#### Changed
- Documentation hierarchy updated across core files.
- `README.md` simplified to act as an entrypoint.

#### Removed
- Legacy architecture documentation duplicates.

#### Documentation
- Consolidated SSOT references in `RUNBOOK.md` and `AGENTS.MD`.

#### Governance
- Codified domain-owner approval rules.
- Established strict branch lifecycle guidelines.
- Outlined KPIs and governance roadmap milestones.
