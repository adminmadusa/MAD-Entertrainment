# TODO Audit Fixes

## Purpose

This file tracks known audit findings and cleanup opportunities for the MAD Entertrainment repository.

This is a backlog and planning document. It should not start a new implementation stream while another task is active.

Current workflow rule:

- Only one active implementation task at a time.
- F-08 is implemented and awaiting verification.
- Complete QA, final review, PR, merge, branch cleanup, and develop sync before starting repository-wide cleanup work.

## Current Status

- Active implementation task: F-08
- F-08 status: Awaiting verification
- Repository-wide cleanup status: Backlog only
- Next allowed action: verify and close F-08 before starting these fixes

## Summary Table

| Section | Status | Risk |
|---|---:|---|
| README.md | Missing | Low risk to add |
| TESTING.md | Missing | Low risk to add |
| AGENTS.md | Missing | Low risk to add |
| Server ESLint | Missing | Low risk to add, needs dependency install approval |
| Coverage threshold | Not set | Add only after coverage baseline is measured |
| Mobile, `/tickets` excessive scroll | High impact | Low risk to reduce padding or extract presentational components |
| Mobile, admin tables horizontal scroll | Medium impact | Medium risk because layout changes can affect workflows |
| Large file, `payment.service.ts` around 2225 lines | High risk to touch | Payment logic, do not refactor without full tests |
| Large file, `tickets/page.tsx` around 889 lines | Safer extraction target | Presentational subcomponents |
| Large file, `AuthForm.tsx` around 784 lines | Safer extraction target | Hook extraction |
| Large file, `team/page.tsx` around 746 lines | Safer extraction target | Modal extraction |
| Socket handler tests | Missing, security-relevant | Add tests before refactor |
| Web/Admin frontend tests | Missing | Start with smoke tests |

## Governance Rules

Before starting any item in this file:

- Confirm no other implementation task is active.
- Verify F-08 is fully closed if it is still in progress.
- Run or review existing governance checks first.
- Prefer extending existing governance tooling before adding new tools.
- Do not create overlapping scripts if `scripts/ci_governance_check.ts` already covers the concern.
- Do not run deploy, upload, migration, destructive, or production commands without explicit approval.
- Do not refactor payment, auth, security, upload, or database logic without tests first.

## Existing Governance Check

Review this before adding new tooling:

```txt
scripts/ci_governance_check.ts
