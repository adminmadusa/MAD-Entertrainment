# AGENTS.md

# MAD Entertrainment Engineering Governance & AI Agent Operating System

Version: 1.0

Status: Mandatory

Applies To:

* Human Developers
* AI Coding Agents
* Code Review Agents
* Audit Agents
* Refactoring Agents
* PR Review Agents

---

# PURPOSE

This document defines how all engineering work must be performed in the MAD Entertrainment repository.

The goals are:

* Maintain a Single Source of Truth (SSOT)
* Prevent duplicate logic
* Prevent duplicate UI
* Prevent dead code
* Prevent legacy code accumulation
* Prevent orphan APIs
* Prevent orphan UI
* Maintain repository hygiene
* Maintain frontend/backend alignment
* Protect production systems
* Maintain long-term maintainability

Failure to follow these rules is considered a governance violation.

---

# CORE PRINCIPLES

Every change must satisfy:

1. Correctness
2. Security
3. Maintainability
4. Scalability
5. Simplicity
6. Traceability
7. Reversibility

---

# ONE TASK RULE

Only one active implementation task may exist at a time.

A task is not complete until:

* Implementation Complete
* Verification Complete
* PR Approved
* Merge Complete
* Branch Cleanup Complete
* Develop Sync Complete

Do not begin a second implementation stream until the first is fully completed.

New findings must be added to backlog.

Never interrupt active implementation.

---

# HARD SAFETY RULE

Audit-only means:

NO:

* Editing
* Refactoring
* Deleting
* Installing packages
* Staging
* Committing
* Pushing
* Merging
* Rebasing
* Branch deletion

without explicit approval.

Never modify code first.

Always audit first.

---

# SINGLE SOURCE OF TRUTH (SSOT)

Every business rule must have exactly one owner.

Ownership Matrix:

Auth → Server

Payments → Server

Bookings → Server

Ticket Status → Server

Pricing → Server

Availability → Server

Seat Locking → Server

RBAC → Server

Notifications → Server

UI State → Frontend

UI Presentation → Frontend

Frontend must never own business rules.

Frontend must never duplicate backend decisions.

---

# SHARED OWNERSHIP RULE

Reusable logic must live in:

packages/shared

packages/ui

packages/types

packages/utils

packages/validations

Before creating:

* Utility
* Type
* Schema
* Constant
* Validation

Search repository first.

Reuse existing implementations.

Do not create duplicates.

---

# FRONTEND BACKEND CONTRACT GOVERNANCE

Every UI must trace:

Page
→ API
→ Service
→ Database

Before implementation identify:

* Endpoint
* Request Schema
* Response Schema
* Error Schema
* Auth Rules
* Ownership Rules

Frontend assumptions must match backend responses exactly.

No frontend-only business logic.

No duplicated validation.

Shared schemas are mandatory.

---

# ORPHAN PREVENTION POLICY

Every page must have:

* Route
* Owner
* Consumer
* Purpose

Every API must have:

* Consumer
* Owner
* Purpose

Every component must have:

* Consumer
* Purpose

Every service must have:

* Caller

If no consumer exists:

Do not create it.

---

# DUPLICATE CODE PREVENTION

Before adding code:

Search repository.

Review:

* Components
* Services
* Hooks
* Utilities
* Validators
* Contracts

Never duplicate:

* Validation
* Pricing
* Status Logic
* Permissions
* API Wrappers
* Formatting Functions
* Error Handling Patterns

Reuse existing implementation.

---

# DEAD CODE POLICY

Before every PR:

Review:

* Unused imports
* Unused functions
* Unused hooks
* Unused state
* Unused interfaces
* Unused types
* Unused constants
* Unused files
* Unused routes

If verified unused:

Delete it.

Do not keep:

"for future use"

code.

---

# LEGACY CODE POLICY

Legacy code requires:

LEGACY
Reason
Owner
Ticket
Removal Plan

Example:

LEGACY
Reason: Checkout V1 compatibility
Owner: Platform Team
Ticket: BUG-401

Undocumented legacy code is technical debt.

---

# FILE SIZE GOVERNANCE

Preferred Limits

Component:
0-300 lines

Hook:
0-250 lines

Schema:
0-300 lines

Controller:
0-200 lines

Service:
0-500 lines

Review Required

Component:
301-500

Service:
501-700

Refactor Required

701+

PR Blocked

1000+

No exceptions.

---

# CODE QUALITY RULES

Every file must satisfy:

* Single Responsibility Principle
* Clear Naming
* Low Coupling
* High Cohesion
* Minimal Complexity
* Readability
* Maintainability

Avoid:

* Magic Numbers
* Magic Strings
* Nested Conditions
* Duplicated Error Handling
* Duplicated Validation

Prefer:

* Shared Constants
* Shared Types
* Shared Schemas
* Shared Utilities

---

# REPOSITORY HYGIENE

Disallowed Folder Names:

temp
temp2
misc
old
backup
new-folder
final
test2

Every folder requires ownership.

Every file requires ownership.

Avoid dumping unrelated utilities into generic folders.

---

# BRANCH SAFETY

Protected Branches:

develop

live

Never commit directly.

Always create task branches.

Allowed:

feat/<name>

fix/<name>

refactor/<name>

audit/<name>

docs/<name>

test/<name>

chore/<name>

seo/<name>

Examples:

feat/ticket-dashboard

fix/payment-verification

audit/ui-005-review

refactor/auth-hook

---

# BRANCH HYGIENE

Before new work:

git checkout develop

git pull origin develop

git status

Verify:

* Working tree clean
* develop == origin/develop
* Previous task completed
* Previous branch merged
* Previous branch cleaned

Do not stack implementation branches.

---

# BRANCH LIFECYCLE MANAGEMENT

Mandatory branch lifecycle rules:

## 1. Audit Branches (audit/*)
* Used for discovery, diagnostics, and evidence gathering only.
* No production edits, commits, or deployments are allowed.
* Once the audit is completed or an issue is created, the branch must be deleted immediately.

## 2. Workstream Branches (feat/*, fix/*, refactor/*, etc.)
* Strict boundary: 1 Issue = 1 Branch = 1 PR.
* Reusing merged branches or combining multiple issues is forbidden.
* Immediately after a PR is merged and verified in staging/production, delete both the local and remote branches.

## 3. Stale Branch Policy
* Any branch behind develop by > 30 commits is stale.
* Stale branches must be rebased and continued, or closed and deleted.

## 4. Weekly Cleanup Schedule
* Human developers and AI agents must review local and remote branches weekly to prune stale or merged branches.

---

# MANUAL VERIFICATION GATE

Before editing show:

* Current Branch
* Git Status
* Files To Change
* Reason For Change
* Risk Level
* Patch Summary
* Verification Plan
* Rollback Plan

Wait for approval.

Required approval:

Approved to edit:

<file>

<file>

Without approval:

Stop.

---

# HIGH RISK AREAS

Require explicit approval:

* Payment Logic
* Auth Logic
* Upload Logic
* Security Logic
* Database Schema
* Migrations
* CI/CD
* Deployment
* Environment Variables
* Socket Handlers

Never refactor high-risk systems without tests.

---

# MOBILE UX GOVERNANCE

All mobile screens must support:

* Responsive Layout
* No Horizontal Scroll
* 44px Touch Targets
* Keyboard Safety
* Visible CTA
* Accessible Navigation

Required states:

Loading

Empty

Error

Offline

Unauthorized

Success

---

# ACCESSIBILITY GOVERNANCE

Required:

* ARIA Labels
* Keyboard Navigation
* Focus Management
* Screen Reader Support
* Escape Key Handling
* Form Labels

Accessibility regressions block merge.

---

# TESTING GOVERNANCE

Before merge run:

pnpm lint

pnpm test

pnpm build

Failures must be resolved.

Never ignore failures.

---

# TOOLING GOVERNANCE

Before adding tooling:

Review existing tooling.

Avoid overlap.

Avoid duplicate tools.

Do not install dependencies without approval.

---

# DOCUMENTATION GOVERNANCE

Changes affecting:

* Payments
* Auth
* Bookings
* Tickets
* APIs
* Infrastructure
* Deployments

must update documentation.

Required documents:

AGENTS.md

ARCHITECTURE.md

API_CONTRACTS.md

RUNBOOK.md

TESTING.md

DEPLOYMENT_MAP.md

CHANGELOG.md

---

# AUDIT REQUIREMENTS

Every audit must review:

* Functionality
* Security
* Performance
* Maintainability
* Dead Code
* Duplicate Code
* Legacy Code
* Unused Files
* Repository Hygiene
* Frontend Backend Alignment
* Future Risk

No assumptions.

Evidence required.

---

# IMPLEMENTATION WORKFLOW

PHASE 1

Audit

PHASE 2

Plan

PHASE 3

Approval

PHASE 4

Implementation

PHASE 5

Verification

PHASE 6

Approval

PHASE 7

Commit

PHASE 8

Push

PHASE 9

PR

PHASE 10

Merge

PHASE 11

Cleanup

PHASE 12

Develop Sync

---

# PR QUALITY GATE

Before merge answer:

1. Is there a single source of truth?

2. Did we add duplicate logic?

3. Did we add duplicate validation?

4. Did we add duplicate UI?

5. Did we create dead code?

6. Did we create legacy code?

7. Did we create orphan UI?

8. Did we create orphan APIs?

9. Are frontend and backend aligned?

10. Are file size limits respected?

11. Can a new developer understand this in ten minutes?

If any answer is NO:

Do not merge.

---

# RELEASE GOVERNANCE

Before merging develop → live:

Verify:

* Build Passes
* Tests Pass
* Contracts Valid
* No Critical Findings
* Rollback Plan Exists

Release only after explicit approval.

DEPLOYMENT PARITY CHECK (MANDATORY)

Before auditing any issue:

- Verify frontend environment.
- Verify frontend branch.
- Verify backend environment.
- Verify backend branch.
- Verify deployment completion.

MAD currently uses:

Frontend:
- Vercel Production → live
- Vercel Test → develop

Backend:
- Render → live only

Test environments share the same Render backend.

A bug is not considered reproducible until deployment parity has been verified.
---

# FINAL MAD GOLDEN RULE

Do not optimize for speed.

Optimize for:

Correctness

Maintainability

Safety

Consistency

Traceability

Long-Term Repository Health

The cleanest code is the code that never needs to be rewritten.
