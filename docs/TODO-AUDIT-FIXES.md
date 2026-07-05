# TODO Audit Fixes & Backlog

- **Owner**: Repository Governance Owner
- **Status**: Active
- **Version**: 1.0
- **Review Cycle**: Ongoing
- **Last Updated**: 2026-07-01
- **Related Documents:**
  - [README.md](../README.md)
  - [REPOSITORY_GOVERNANCE.md](../REPOSITORY_GOVERNANCE.md)
  - [AGENTS.MD](../AGENTS.MD)
  - [Historical Audits Index](audit/README.md)
  - [Finding Classification Dashboard](finding_classification_todo.md)
  - [Post-Launch Engineering Roadmap](ROADMAP.md)
  - [Staged Remediation Plan](remediation-plan.md)
  - [Verification Results](verification-results.md)
  - [PR4 Decisions Needed](PR4-DECISION-NEEDED.md)

---

## Purpose

This file tracks known audit findings, technical debt, governance findings, and future improvement opportunities for the MAD Entertrainment repository.

This is a backlog and planning document only.

---

## Workflow Rules

* Only one active implementation task is allowed at a time.

* Do not begin a new implementation task until the current task has completed:

  * Implementation
  * Verification
  * PR Review
  * Merge
  * Branch Cleanup
  * Develop Sync

* Newly discovered issues should be added to this backlog and prioritized later.

* Do not interrupt an active implementation task unless there is a critical production issue.

---

## Current Status

* Active implementation task: None
* Repository status: Clean
* Develop status: Synced
* Backlog status: Available for prioritization

---

## Open Backlog Items

### SEO-001 — Structured Data Enhancement

**Priority:** Medium

#### Goal

Improve search engine visibility and rich search results by expanding structured data coverage across the public website.

#### Scope

##### Add Organization JSON-LD

Location:

* `apps/web/src/app/layout.tsx`

Purpose:

* Identify MAD Entertrainment as the site owner.
* Improve brand/entity recognition by search engines.

##### Add Website JSON-LD

Location:

* `apps/web/src/app/layout.tsx`

Purpose:

* Define website metadata.
* Support search engine understanding of site structure.

##### Add SearchAction Schema

Location:

* `apps/web/src/app/layout.tsx`

Purpose:

* Enable enhanced search engine understanding of site search capabilities.
* Only implement if a public search endpoint exists.

##### Add Homepage Structured Data

Location:

* `apps/web/src/app/page.tsx`

Purpose:

* Improve homepage indexing and entity association.

##### Evaluate Breadcrumb Schema

Locations:

* `apps/web/src/app/events/[slug]/page.tsx`
* `apps/web/src/app/dj-operators/[slug]/page.tsx`
* Other public detail pages

Purpose:

* Improve navigation understanding for search engines.

#### Files

Modify:

* `apps/web/src/app/layout.tsx`
* `apps/web/src/app/page.tsx`

Review:

* `apps/web/src/app/events/[slug]/page.tsx`
* `apps/web/src/app/dj-operators/[slug]/page.tsx`

#### Risk

Low

#### Dependencies

None

#### Out of Scope

* Payment flows
* Authentication
* APIs
* Database changes
* Event booking logic
* Ticket generation

#### Rollback

Restore:

* `apps/web/src/app/layout.tsx`
* `apps/web/src/app/page.tsx`

#### Status

Backlog – Not Started

---

## Repository Findings

| Area                                | Status               | Risk   |
| ----------------------------------- | -------------------- | ------ |
| README.md                           | ✅ Resolved          | Low    |
| TESTING.md                          | ✅ Resolved          | Low    |
| Server ESLint                       | Missing              | Low    |
| Coverage Threshold                  | Not Configured       | Low    |
| Admin Table Mobile UX               | Audit Recommended    | Medium |
| Socket Handler Tests                | Missing              | Medium |
| Frontend Smoke Tests                | Missing              | Medium |
| Large File Governance               | Ongoing              | Medium |
| `payment.service.ts` (~2200+ lines) | High-Risk Large File | High   |
| `tickets/page.tsx` (~800+ lines)    | Extraction Candidate | Low    |
| `AuthForm.tsx` (~700+ lines)        | Extraction Candidate | Low    |
| Team Page Modal Extraction          | Candidate            | Low    |

---

## Governance Rules

Before starting any backlog item:

1. Confirm no active implementation task exists.
2. Create implementation plan.
3. Define rollback plan.
4. Identify exact files to modify.
5. Assess risk level.
6. Obtain approval before modifying high-risk systems.

### High-Risk Areas

* Payment logic
* Authentication logic
* Security logic
* Upload handling
* Database schemas
* Migrations
* Environment variables
* Deployment configuration
* CI/CD behavior
* Production APIs
* Socket handlers

ARCH-001 — Payment Service Boundary Review
Status: Backlog
Priority: High
Prerequisite: Payment test coverage review

ARCH-002 — Socket Handler Test Coverage
Status: Backlog
Priority: High

TEST-001 — AuthForm Smoke Tests
Status: Backlog
Priority: High

TEST-002 — Ticket Wallet Smoke Tests
Status: Backlog
Priority: High

TEST-003 — Event Detail Smoke Tests
Status: Backlog
Priority: High

TEST-004 — Checkout Flow Smoke Tests
Status: Backlog
Priority: High

ARCH-003 — AuthForm Extraction Plan
Status: Backlog
Priority: Medium

ARCH-004 — Ticket Wallet Extraction Plan
Status: Backlog
Priority: Medium

ARCH-005 — Admin Bookings Component Extraction
Status: Backlog
Priority: Medium

GOV-001 — Server ESLint Audit
Status: Backlog
Priority: Medium

PROD-001 — Secure Diagnostic API Routes
Status: Backlog
Priority: Critical
Source: MAD-500 Audit

PROD-002 — MongoDB Replica Set High Availability Configuration
Status: Backlog
Priority: Critical
Source: MAD-500 Audit

SEC-001 — Axios Client Token Refresh Concurrency Lock
Status: Backlog
Priority: High
Source: MAD-500 Audit

SCAN-001 — Mobile Scanner Offline Caching
Status: Backlog
Priority: High
Source: MAD-500 Audit

### Known High-Risk File

* `apps/server/src/services/public/payment.service.ts`

Do not refactor without tests first.

---

## Existing Governance Tooling

Review before adding new tooling:

```txt
scripts/ci-governance-check.ts
```

Avoid creating duplicate governance scripts if existing tooling already covers the requirement.
