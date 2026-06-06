# AGENTS.md

## Purpose

This file defines how AI coding agents should work in this repository.

The agent must follow these rules before editing, testing, refactoring, installing dependencies, or changing project structure.

## Current Project Rule

Only one active implementation task is allowed at a time.

If a feature is awaiting QA, review, PR, merge, branch cleanup, or develop sync, do not begin a new implementation stream.

Current known workflow rule:
- F-08 must be fully verified, reviewed, merged, cleaned up, and synced with develop before starting repository-wide cleanup work.

## Before Editing

Before making changes, the agent must:

1. Inspect the relevant files.
2. State the exact files it plans to edit.
3. Explain the risk level.
4. Ask for approval if the change touches high-risk areas.

Do not edit first and explain later.

## High-Risk Areas

Ask before changing:

- Payment logic
- Auth logic
- Security logic
- Upload logic
- Database schema or migrations
- Deployment config
- Environment variable handling
- CI/CD behavior
- Socket handlers
- Production API behavior

Known high-risk file:

- `payment.service.ts`, large payment file, do not refactor without full tests first.

## Safe Starting Areas

These are safer cleanup targets:

- `tickets/page.tsx`, presentational extraction
- `AuthForm.tsx`, hook extraction
- `team/page.tsx`, modal extraction
- README and testing documentation
- Agent instruction files
- Mobile spacing fixes with no business logic changes

## Mobile UI Rules

When improving mobile UI:

- Do not change backend behavior.
- Do not change business logic.
- Prefer reducing excessive padding before restructuring.
- Keep primary actions visible earlier on mobile.
- Collapse secondary filters where useful.
- Avoid horizontal scrolling for admin tables where possible.
- Replace wide table views with mobile cards only after checking risk.
- Document manual mobile verification steps.

Known issues:

- `/tickets` has high-impact excessive scrolling.
- Admin tables have medium-risk horizontal scrolling.

## Large File Rules

Files over 500 lines should not receive more unrelated logic.

When touching a large file:

1. Identify one focused extraction target.
2. Extract only one component, hook, helper, type group, or constants group.
3. Keep behavior unchanged.
4. Add or update tests when behavior is affected.
5. Avoid mixing refactor and feature work.

Do not refactor high-risk files without tests first.

## Duplicate Code Rules

Before adding new code, search for existing implementations.

Use:

```bash
rg "functionName|componentName|similar text"
find . -name "*similar*"