---
name: "ci-investigation"
description: "Evidence-driven diagnostic investigation for CI pipeline failures, compile errors, local debugging, profiling, and Caveman root-cause analysis."
version: "1.1"
owner: "Lead Diagnostic Engineer"
last_updated: "2026-07-03"
depends_on: "None"
supersedes: "Caveman"
scope: "Investigation"
priority: "Core"
---

# CI & Debugging Investigation Skill

## Purpose
Enforce a disciplined, diagnostic-first workflow (`GOV-INV-001`) to systematically isolate, reproduce, and remediate build, compilation, lint, test, performance, and runtime failures.

## Trigger Keywords
debugging, root-cause analysis, profiling, stack trace, race condition, Caveman, CI failure, build crash, vitest error, memory leak, git archaeology, memory snapshot, performance bottleneck, failure isolation, minimal reproduction, target error, connection fail, flaky test, timeout, deadlock, crash dump, regression, segmentation fault, stack overflow, promise rejection, dependency conflict, lockfile, node version, environment drift.

## Prerequisites
- Raw symptoms and error logs collected.
- Local repository working tree status verified.
- Target reproduction environment verified.
- Environment variables validated.

## Investigation Principles
- **Evidence before assumptions**: A plausible explanation is never a verified root cause. Never guess at a solution.
- **Reproduce before fixing**: Isolate and recreate the failure in a clean local environment or scratch file before writing any hot-fixes.
- **Prefer minimal changes**: Propose the narrowest, most targeted, and reversible change possible.
- **Avoid speculative fixes**: Never change production code without first proving that the candidate change resolves the isolated defect.
- **Verify every conclusion**: Promote a hypothesis to a root cause only when validated by at least two independent evidence sources.
- **Preserve diagnostics**: Clean up temporary logs, diagnostics, and test scripts before merge.
- **Eliminate one variable at a time**: Isolate environment parameters, node versions, and caches step-by-step.

## Investigation Workflow
Before recommending or implementing a code fix:
1. **Collect evidence**: Gather the exact error logs, description of symptoms, and environmental context.
2. **Reproduce the issue**: Build a minimal reproducible example (locally or in a scratch script).
3. **Determine Scope**: Distinguish between isolated errors and systemic repository-wide issues.
4. **Isolate variables**: Contrast the failing environment with working configurations.
5. **Form hypotheses**: Generate multiple plausible root-cause hypotheses (typically three or more for complex issues), then eliminate them using evidence.
6. **Falsify hypotheses**: Design quick tests specifically aimed at disproving each hypothesis.
7. **Identify the root cause**: Confirm the single survivor of falsification with evidence.
8. **Propose the smallest safe fix**: Outline the narrowest fix that directly addresses the root cause.
9. **Verify the fix**: Run the verification tests in both local and simulated environments.
10. **Document**: Record diagnostics and lessons learned.

## Responsibilities

### 1. Diagnostics & Root Cause Analysis
- **Stack Trace Audits**: Trace uncaught exceptions and core dumps back to the initiating files and modules.
- **Race Conditions**: Isolate and trace asynchronous lifecycle execution, socket events, or event-loop locks.
- **Memory Profiling**: Analyze heap allocations and locate memory leak sources.
- **Performance Profiling**: Analyze query execution times, indexing bottlenecks, and network round-trip overhead.

### 2. Git Archaeology & History Tracing
- **Introducing Commit**: Identify the introducing commit.
- **Merge History**: Review merge history.
- **Revision Comparison**: Compare working vs failing revisions.
- **Regression Detection**: Detect regressions and minimize the search range.

## Evidence Requirements
Evidence should include one or more of the following, as applicable:
- stack traces
- logs
- profiler output
- test failures
- screenshots
- timing measurements
- Git history
- telemetry

## Investigation Output
Every investigation should conclude with:
- Confirmed root cause
- Supporting evidence
- Reproduction steps
- Scope of impact
- Recommended fix
- Verification performed
- Remaining risks

## Boundaries
- **When to Use**:
  - When isolating a test suite failure, compiler error, or pipeline crash.
  - When tracing performance bottlenecks, memory leaks, or race conditions.
  - When performing Git archaeology or log diagnostics.
- **When NOT to Use**:
  - For designing new features or writing new code (use **architecture-review**).
  - For writing or modifying governance validators/fixers (use **governance-audit**).
  - For editing markdown manuals or updating runbooks (use **documentation**).
  - For visual layout styling and mobile UX audits (use **ui-ux**).
  - For git branch lifecycles (use **git-workflow**).
  - For final pull request gating checks (use **pr-review**).

## Non-Goals
This skill never:
- Designs system architecture.
- Writes governance validators.
- Creates documentation.
- Performs UI reviews.
- Manages Git workflows.
- Reviews pull requests.

## Reuse Policy
Before proposing a new diagnostic script or helper:
- Search existing repository scripts first.
- Reuse existing debugging utilities.
- Extend current tooling before creating new tools.
- Check if upstream fixes or official updates already exist.
- Avoid introducing local workarounds that bypass established validators.
- Keep diagnostic scripts isolated in scratch directories.

## Skill Relationships
Primary:
- ci-investigation

Collaborates with:
- governance-audit
- architecture-review
- documentation
- pr-review
- git-workflow

Does Not Replace:
- governance-audit
- architecture-review
- documentation
- ui-ux
- git-workflow
- pr-review
