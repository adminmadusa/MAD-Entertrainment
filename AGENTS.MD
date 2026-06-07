# AGENTS.md

## Purpose

This file defines how AI coding agents must work in this repository.

The agent must follow these rules before editing, testing, refactoring, installing dependencies, changing project structure, staging, committing, pushing, merging, or deleting branches.

---

## Hard Safety Rule

Audit-only means no file changes.

The agent must not create, edit, delete, refactor, install, stage, commit, push, merge, rebase, or delete branches unless the developer explicitly approves the exact action.

Do not edit first and explain later.

---

## Core Workflow Rule

Only one active implementation task is allowed at a time.

A task is not complete until all of the following are finished:

* Implementation
* Verification
* PR Review
* Merge
* Branch Cleanup
* Develop Sync

If a feature is awaiting any of the above, do not begin a new implementation stream.

New findings, bugs, audits, ideas, and improvements must be added to the backlog and prioritized later.

---

## Manual Verification Gate

Before any change, the agent must stop and show:

* Current branch
* `git status --short`
* Exact files proposed for change
* Why each file needs changing
* Risk level for each file
* Proposed patch summary
* Verification plan
* Rollback plan

Proceed only after the developer explicitly says:

```txt
Approved to edit these files:
- <path>
- <path>
```

If approval is not explicit, do not edit.

---

## Branch and Commit Safety

Never commit directly to protected branches.

Protected branches:

* `develop`
* `live`

Before editing, always run:

```bash
git branch --show-current
git status --short
```

If the current branch is `develop` or `live`, stop and ask to create a task branch.

All work must happen on a task branch created from `develop`.

Allowed task branch names:

```txt
feat/<task-name>
docs/<task-name>
fix/<task-name>
refactor/<task-name>
test/<task-name>
chore/<task-name>
audit/<task-name>
seo/<task-name>
```

Examples:

```txt
docs/add-testing-guide
fix/mobile-ticket-spacing
refactor/extract-auth-cooldown-hook
test/add-socket-handler-tests
chore/add-server-lint
audit/dpdp-review
seo/structured-data-enhancement
```

Never run these commands without explicit approval:

```bash
git add
git commit
git push
git merge
git rebase
git branch -d
git branch -D
git push origin --delete
```

Before committing, show:

* Current branch
* Full `git status --short`
* Exact files to stage
* Exact commit message
* Test/lint/build results
* Whether the branch is safe to commit on

Commit only after the developer explicitly approves the commit message.

Use Conventional Commits.

Examples:

```txt
docs: add testing guide
test: add socket handler coverage
refactor: extract ticket status banners
fix: reduce mobile ticket wallet spacing
chore: add server lint script
```

---

## Branch Hygiene Rule

Before creating a new task branch:

1. Verify current branch

```bash
git branch --show-current
```

2. Verify working tree

```bash
git status --short
```

3. Check for unfinished task branches

```bash
git branch
```

4. Confirm the current implementation task is:

* Merged
* Cleaned up
* Synced with develop

Do not create a new implementation branch if another implementation branch is still active.

---

## Before Editing

Before making changes, the agent must:

1. Inspect relevant files.
2. State exact files to be changed.
3. Explain why each file must change.
4. Identify risk level.
5. Ask for approval.
6. Wait for explicit approval.

Do not edit first and explain later.

---

## High-Risk Areas

Always ask before changing:

* Payment logic
* Auth logic
* Security logic
* Upload logic
* Database schema
* Migrations
* Deployment config
* Environment variables
* CI/CD behavior
* Socket handlers
* Production API behavior

Known high-risk files:

```txt
apps/server/src/services/public/payment.service.ts
apps/server/src/sockets/index.ts
```

Do not refactor high-risk files without tests first.

---

## Safe Starting Areas

Safer cleanup and refactor targets:

```txt
README.md
TESTING.md
TODO-AUDIT-FIXES.md
docs/*
apps/web/src/app/tickets/page.tsx
apps/web/src/components/auth/AuthForm.tsx
apps/admin/src/app/team/page.tsx
```

---

## Mobile UI Rules

When improving mobile UI:

* Do not change backend behavior.
* Do not change business logic.
* Prefer reducing excessive padding before restructuring.
* Keep primary actions visible earlier.
* Collapse secondary filters only when appropriate.
* Avoid horizontal scrolling where possible.
* Document manual mobile verification.

Known mobile findings:

```txt
Admin tables have medium-risk horizontal scrolling.
Event detail pages contain tall mobile sections.
Checkout pages have deeply buried payment sections.
```

---

## Large File Rules

Files over 500 lines should not receive unrelated logic.

When touching a large file:

1. Identify one extraction target.
2. Extract only one component, hook, helper, constants group, or type group.
3. Keep behavior unchanged.
4. Add/update tests if behavior changes.
5. Avoid mixing feature work and refactoring.

Known large-file priorities:

```txt
Safe:
- tickets/page.tsx
- AuthForm.tsx
- team/page.tsx

Medium:
- admin bookings page modal extraction

High:
- payment.service.ts
```

---

## Duplicate Code Rules

Before adding code:

```bash
rg "functionName|componentName|similar text"
find . -name "*similar*"
```

Preferred tools:

```txt
jscpd
knip
```

Use caution:

```txt
depcheck
```

Never remove dependencies based solely on depcheck.

---

## Dead and Legacy Code Rules

Before deleting anything:

1. Search references.
2. Check imports/exports.
3. Check routes.
4. Check dynamic imports.
5. Check config/scripts/tests.
6. Check runtime conventions.
7. Confirm with knip.
8. Obtain approval.

Never delete:

* Payment files
* Auth files
* Socket files
* Migration files
* Deployment files
* Environment files

without explicit approval.

---

## Testing and Coverage Rules

Do not raise coverage thresholds blindly.

Process:

1. Measure coverage.
2. Record baseline.
3. Set threshold slightly below baseline.
4. Raise gradually.

Priority gaps:

```txt
Socket handlers
AuthForm smoke tests
Tickets page smoke tests
EventDetailClient smoke tests
CheckoutContent smoke tests
Admin booking page smoke tests
```

---

## Tooling Rules

Before adding tooling:

* Review existing scripts.
* Extend existing tooling where possible.
* Avoid overlapping tools.
* Do not install dependencies without approval.

Known lint status:

```txt
apps/web     -> ESLint
apps/admin   -> ESLint
apps/server  -> No dedicated lint script
root         -> Turbo lint
```

---

## Governance Checks

Review existing governance tooling before adding new rules.

Known governance script:

```txt
scripts/ci_governance_check.ts
```

Before PR or merge, run approved checks:

```bash
pnpm lint
pnpm test
pnpm build
```

Do not ignore failures.

---

## Implementation Workflow

### Audit

* Inspect files
* Identify branch
* Identify risk
* Identify scope
* Confirm one-task rule

### Plan

Provide:

* Goal
* Files to change
* Files not to touch
* Risk level
* Test plan
* Rollback plan

### Implement

* Smallest safe change
* No unrelated cleanup
* One extraction at a time
* No high-risk refactors without tests

### Verify

Run approved verification:

```bash
pnpm lint
pnpm test
pnpm build
```

For mobile work document:

* Device width
* Page tested
* Before/after behavior
* CTA visibility
* Scroll behavior

### Commit

Only after approval.

Show:

```bash
git branch --show-current
git status --short
```

Then provide:

* Files changed
* Commit message
* Verification results

---

## PR, Merge, and Branch Cleanup

Do not open PRs, merge, or delete branches without approval.

Before PR:

* Branch is not develop/live
* Scope matches approval
* Verification completed
* TODOs updated
* No risky files changed without approval

PR description must include:

* What changed
* Why it changed
* Files changed
* Tests run
* Manual QA
* Risks
* Follow-up items

After merge into develop, only with approval:

```bash
git checkout develop
git pull origin develop
git branch -d <branch>
git push origin --delete <branch>
```

For releases:

* Verify develop
* Obtain release approval
* Merge develop → live only after approval

Never delete branches automatically.
