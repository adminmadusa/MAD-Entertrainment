# AGENTS.md

- **Owner**: Repository Governance Owner
- **Status**: Mandatory
- **Version**: 1.0
- **Review Cycle**: Quarterly
- **Last Updated**: 2026-06-25
- **Related Documents:**
  - [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md)

---

# MAD Entertrainment Engineering Governance & AI Agent Operating System

Applies To:

* Human Developers
* AI Coding Agents
* Code Review Agents
* Audit Agents
* Refactoring Agents
* PR Review Agents

---

## Relationship to Repository Governance Policy
The repository governance policies (roles, matrices, branch and PR policies) are canonically defined in [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md). This file (`AGENTS.md`) serves as the operational instructions and guidelines for human and AI agents implementing those policies in the codebase.

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

Repository Governance SSOT → REPOSITORY_GOVERNANCE.md

Architecture Decisions (ADRs) → docs/decisions/README.md

For policy rules, branch/PR standards, and document ownership, refer to the [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md). For details on why technical and architectural decisions are made, refer to the Architecture Decision Records (ADR) system at [docs/decisions/README.md](docs/decisions/README.md). All automated agents and human developers must review and adhere to the approved decisions.

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

* **Governance Cache**: The `.governance/` folder is exclusively local. It is listed in `.gitignore` and must remain untracked by Git at all times. If `.governance/` files appear in `git status`, run `git rm -r --cached .governance/` immediately to untrack them and prevent commit noise.

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
* Immediately after a PR is merged and verified in staging/production, delete both the local and remote branches in accordance with **RULE-GIT-001** and **RULE-GIT-002**.

## 3. RULE-GIT-001 — Branch Cleanup Verification Protocol
* **Preconditions**:
  * PR is merged.
  * Working tree is clean.
  * No uncommitted changes.
  * All CI/CD checks passed.
* **Step 1 — Verify Working Tree**:
  `git status` must show `nothing to commit, working tree clean`.
* **Step 2 — Synchronize Develop**:
  ```bash
  git checkout develop
  git pull origin develop
  ```
* **Step 3 — Verify PR Merge**:
  Confirm the pull request has been merged on GitHub.
* **Step 4 — Verify Merge Strategy & Commit Reachability**:
  Run:
  ```bash
  git merge-base --is-ancestor feature-branch develop
  ```
  If true: Continue.
  If false: Run:
  ```bash
  git cherry develop feature-branch
  ```
  Expected:
  ```
  -
  -
  -
  ```
  Only `-` entries indicate patch-equivalent commits already exist on `develop`. Any `+` entry means the branch still contains unique work. Stop immediately.
* **Step 5 — Delete Local Branch**:
  Safe delete: `git branch -d feature-branch`.
  Only if PR is merged and patch equivalence is verified, you may run: `git branch -D feature-branch`.
* **Step 6 — Delete Remote Branch**:
  `git push origin --delete feature-branch`.
* **Step 7 — Prune References**:
  `git fetch --prune`.
* **Step 8 — Final Verification**:
  Ensure `git status`, `git branch`, and `git branch -r` confirm:
  * Clean working tree.
  * Feature branch removed locally.
  * Feature branch removed remotely.

## 4. RULE-GIT-002 — No Branch Cleanup with Local Changes
* A feature branch **must not** be deleted while the repository contains uncommitted or unstaged changes.
* Verification: `git status` must be clean.
* If the working tree is not clean, one of the following must occur before cleanup:
  * Commit the changes.
  * Stash the changes.
  * Discard the changes.

## 5. Stale Branch Policy
* Any branch behind develop by > 30 commits is stale.
* Stale branches must be rebased and continued, or closed and deleted.

## 6. Weekly Cleanup Schedule
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

# VISUAL, UX & ACCESSIBILITY GOVERNANCE

## Design Principles
- **Mobile-First & Responsive**: Design layouts to scale gracefully. No horizontal scrolling is permitted on supported mobile viewports.
- **Accessibility-First**: Ensure all visual elements are accessible from design inception. Follow WCAG AA conformance guidelines.
- **Visual Consistency**: Use the project's approved design tokens for spacing, typography, colors, and elevation. Avoid hardcoded values.
- **Reuse Existing Components**: Prioritize composition and customization of existing components over creating custom overrides.
- **Technology Alignment**: Prefer existing repository UI components, reuse approved design system primitives, and use shared design tokens. Introduce new components only when existing primitives cannot satisfy the requirement. (For MAD Entertrainment, this currently means shadcn/ui and Radix UI).

## Responsive & Tailwind Standards
- **Breakpoint System**: Utilize standard responsive breakpoints consistently across pages.
- **Layout Containers**: Use standard page spacing, consistent margin containers, and layout grids.
- **Flexbox & Grid Layouts**: Enforce flexbox/grid containers to handle overflow, wrapping, and text truncation cleanly.

## Component & State Standards
- **Touch Target Sizes**: Minimum 44px for all interactive buttons, links, and form fields.
- **Accessible Focus**: Focus indicators must be highly visible when navigating via keyboard.
- **Standard States**: Interactive elements must support and visually distinguish:
  - Default / Hover / Active
  - Focus Visible / Keyboard Navigation
  - Disabled / Readonly
  - Loading / Skeletons / Transition states
- **Boundary UI States**: Every data-driven container must implement fallback templates for:
  - Loading state
  - Empty state
  - Error state
  - Offline state
  - Unauthorized state
  - Success state

## Accessibility Requirements (WCAG AA)
- **Semantic HTML**: Use appropriate HTML5 tags (e.g., `<main>`, `<section>`, `<article>`, `<nav>`, `<button>`).
- **ARIA & Screen Readers**: Provide descriptive `aria-label` tags for icon buttons, and maintain correct role mappings.
- **Keyboard Navigation**: Keep focus order logical and trap focus properly within modals/drawers. Implement Escape-key handling to close overlays.
- **Contrast**: Text and interactive components must satisfy WCAG AA contrast ratio requirements.

## UI Performance
- Minimize layout shift (CLS).
- Lazy-load large content where appropriate.
- Avoid unnecessary client-side rendering.
- Prefer skeletons over spinners for longer loads.
- Avoid blocking animations.
- Optimize images and media.

## Repository UI Rules
- **Modals & Drawers**: Use responsive drawers for mobile viewports and dialog modals for desktop screens.
- **Navigation Consistency**: Align navbars, menus, and footers across the user web application and back-office admin portals.
- **Form Controls**: Use explicit form labels, helper descriptions, error alerts, and native validation states.


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

docs/decisions/README.md

REPOSITORY_GOVERNANCE.md

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

No implementation or file modification may begin until the Implementation Readiness Audit has concluded with one of the approved outcomes.

Every new feature, function, button, link, API, database change, bug fix, refactor, or enhancement must first have a GitHub issue created, then undergo a repository audit to verify whether the requested functionality already exists or is partially implemented.

Every request must end with exactly one decision:

* Already Implemented
* Partially Implemented
* Not Implemented
* Rejected

Only the "Not Implemented" outcome permits proceeding with new implementation, testing, pull request creation, review, and merge.

"Partially Implemented" permits extending the existing implementation only (reusing existing architecture, no duplicate logic).

"Already Implemented" requires no production code changes; the request must be rejected or closed.

"Rejected" closes the request immediately without implementation.

## IMPLEMENTATION DECISION GATE

After the Implementation Readiness Audit, exactly one outcome is permitted:

### Outcome A — Already Implemented
* **Conditions**: Feature exists, behaviour matches requirements, and tests pass.
* **Action**: Do NOT implement. Reject any implementation PR. Create documentation updates only if required. Close or convert the issue.

### Outcome B — Partially Implemented
* **Conditions**: Feature exists but is incomplete.
* **Action**: Extend the existing implementation. Reuse existing architecture. Do not duplicate logic.

### Outcome C — Not Implemented
* **Conditions**: Feature does not exist.
* **Action**: Proceed with implementation following the approved governance workflow.

### Outcome D — Rejected
* **Conditions**: Duplicate issue, duplicate feature, invalid request, architecture conflict, superseded by another issue, or out of scope.
* **Action**: Close the request immediately without implementation.

## FINAL APPROVAL CHECKLIST
Before ending the audit, human developers and AI agents must complete this checklist:

* [ ] Already Implemented
* [ ] Partially Implemented
* [ ] Not Implemented
* [ ] Rejected

* If **Already Implemented**: STOP. Do not write code. Do not create duplicate services. Do not refactor. Recommend documentation updates only (if necessary).
* If **Partially Implemented**: Implement only the missing functionality.
* If **Not Implemented**: Proceed to the implementation planning phase.
* If **Rejected**: Close the request without implementation.

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

# SKILL SELECTION & PROMPT INTELLIGENCE RULES

## Mandatory Prompt Understanding

Before responding to any request, thoroughly analyze the prompt to determine its actual objective.

Do not produce immediate implementation steps or generic responses.

First identify:

* Primary objective
* Business context
* Technical context
* Affected domain
* Technologies involved
* Risk level
* Repository area
* Expected outcome

If the prompt is ambiguous, ask clarifying questions instead of making assumptions.

---

## Intelligent Skill Selection (Mandatory)

Every response must begin by determining which skills are required.

Never answer without selecting the appropriate skills.

Possible skill categories include:

### Core Skills

* Architecture Review
* Repository Governance
* Code Quality Audit
* TypeScript Audit
* React Audit
* Security Audit
* Performance Audit
* Accessibility Audit
* API Contract Audit
* Database Integrity Audit
* Testing Strategy
* Documentation Review

### Domain Skills

* Authentication Audit
* Authorization (RBAC) Audit
* OTP Flow Audit
* Booking Audit
* Payment Audit
* Webhook Audit
* Ticket Audit
* QR Validation Audit
* Notification Audit
* Queue & Worker Audit
* Event Management Audit
* Checkout Audit
* Dashboard Audit
* Admin Audit
* Scanner Audit

### Infrastructure Skills

* Deployment Audit
* Environment Audit
* CI/CD Audit
* Docker Audit
* Redis Audit
* MongoDB Audit
* BullMQ Audit
* Cloud Storage Audit

---

## Skill Justification (Required)

For every selected skill, explain:

* Why it was selected.
* Which part of the prompt triggered it.
* What risks it will evaluate.
* What evidence it will collect.
* What outcome it is expected to produce.

Do not list unnecessary skills.

Only use skills that directly relate to the problem.

---

## Rule Selection (Mandatory)

Automatically identify the governance and engineering rules that apply.

Examples include:

* Repository Governance Rules
* Architecture Rules
* Security Rules
* API Contract Rules
* Authentication Rules
* Authorization Rules
* Payment Integrity Rules
* Transaction Integrity Rules
* Data Integrity Rules
* Accessibility Standards
* Performance Standards
* Code Quality Standards
* Testing Standards
* Deployment Verification Rules

Explain why each rule applies.

---

## Evidence-Driven Analysis

Never rely on assumptions.

Every recommendation must be supported by:

* Repository evidence
* Existing implementation
* Architecture
* Existing patterns
* Technology stack
* Governance standards
* Relevant documentation
* Test evidence (where available)

If evidence is unavailable, clearly state what additional information is required.

---

## Recommended Additional Skills

If the prompt reveals related concerns, recommend additional skills that should also be executed.

For each recommendation include:

* Skill name
* Reason
* Expected benefit
* Priority (Critical / High / Medium / Low)

Example:

Current Request: Authentication Issue

Automatically Recommend:

* Authentication Audit
* Security Audit
* API Contract Audit
* Performance Audit
* Testing Strategy

Reason: Authentication changes affect security, API contracts, session management, and regression risk.

---

## Root Cause Before Solution

Never jump directly to implementation.

Always determine:

* What is happening?
* Why is it happening?
* Where is it happening?
* Which systems are affected?
* What is the root cause?
* What evidence supports the conclusion?

Only after completing this analysis should implementation recommendations be provided.

---

## No Blind Responses

The following are prohibited:

* Generic advice without context.
* Assumption-based recommendations.
* Copy-paste framework guidance.
* Suggesting refactoring without repository evidence.
* Recommending libraries without justification.
* Ignoring existing architecture or governance.

Every response must be specific to the repository, architecture, and evidence.

---

## Final Output Requirements

Every technical response should include:

1. Prompt Understanding
2. Selected Skills
3. Skill Justification
4. Applicable Rules & Standards
5. Root Cause Analysis
6. Evidence Reviewed
7. Risk Assessment
8. Recommended Solution
9. Alternative Solutions
10. Testing & Validation Strategy
11. Additional Recommended Skills
12. Follow-up Recommendations
13. Backlog Items (Out of Scope)

Do not implement code until the analysis, skill selection, and governance review are complete.

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
