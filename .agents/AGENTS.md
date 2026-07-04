# AI Agent Operating System
Version: 2.0
Last Updated: 2026-07-04

This document defines the mandatory **Execution Protocol**, **Repository Preservation Rules**, and **Investigation Workflow** for all AI agents operating in this workspace.

---

# PART 1 — EXECUTION PROTOCOL

Before modifying any code, documentation, scripts, or configurations, you must execute and document the following 13 phases.

## Phase 1 — Task Classification
Analyze the request and explicitly state:
- **Task Category**: (e.g., Bug Fix, Feature, Refactor, Performance, Security, etc.)
- **Primary Objective**: What is the core goal of the task?
- **Scope**: Affected apps, packages, modules, or services.
- **Risk Level**: (Low / Medium / High) with justification.

## Phase 2 — Skill Selection
- Review available skills under `.agents/skills/`.
- Identify the **Primary Skill** and any **Supporting Skills** appropriate for the task.
- Explain why these skills are selected.

## Phase 3 — Repository Discovery
- Search the workspace to identify existing components, helpers, utilities, schemas, or hooks that relate to this task.
- Enforce reuse: never duplicate existing solutions.

## Phase 4 — Existing Solution Search
- Look for previous patterns or implementations of similar features in the codebase to align styling, naming, and structure.

## Phase 5 — Dependency Impact Analysis
- Map out the dependency path of files you intend to change.
- Evaluate the risk of breaking downstream consumer modules or introducing cycles.

## Phase 6 — Git Status & Branch Analysis
- Verify that the active local branch name aligns with the task (e.g., `fix/*`, `feat/*`, `refactor/*`).
- Ensure the working tree is clean before editing.

## Phase 7 — Root Cause Analysis
- For bugs, isolate the root cause from visible symptoms using facts and logs.
- Formulate and test hypotheses.

## Phase 8 — Implementation Plan
- Document the planned changes file-by-file.
- Explicitly call out any design trade-offs.

## Phase 9 — Validation Plan
- Define how you will verify correctness (e.g., specific test commands, manual validation steps, build commands).

## Phase 10 — Execution
- Implement changes incrementally.
- Work in reviewable, logical commits.

## Phase 11 — Post-Implementation Verification
- Run `pnpm run build`, `pnpm run lint`, `pnpm run type-check`, and relevant tests.
- Address any regressions immediately.

## Phase 12 — Repository Cleanup
- Remove any temporary scratch files, debug logs, unused imports, or trailing whitespaces.
- Verify that untracked workspace noise was not introduced.

## Phase 13 — PR Readiness Review
- Validate against the 11-question quality gate in the repository rules.

---

# PART 2 — REPOSITORY PRESERVATION RULES

The AI must preserve repository cleanliness. You must adhere to the following guardrails:
- **No Workspace Noise**: Do not commit or track temporary files, build directories, local config overrides, or `.governance/` outputs.
- **Strict Reuse**: Extend existing abstractions and shared modules. Never duplicate validation schemas, utility functions, or UI components.
- **Minimally Scoped Changes**: Scope edits to the smallest set of files necessary. No unsolicited, opportunistic refactoring.
- **Strict Branch Lifecycles**: Work must happen on feature or fix branches, never directly on protected branches.

---

# PART 3 — INVESTIGATION WORKFLOW (GOV-INV)

## GOV-INV-001 — Root Cause Investigation Governance Standard
Prevent incorrect conclusions, confirmation bias, unnecessary deep investigations, and wasted engineering effort by enforcing a disciplined, evidence-based investigation process.
This standard applies to all production incidents, development issues, performance investigations, security investigations, CI/CD failures, framework issues, dependency problems, and infrastructure debugging.

### Core Principle
> **A plausible explanation is never a verified root cause.**

No hypothesis may be promoted to a root cause until it survives independent verification and repeated attempts at falsification.

### Mandatory Investigation Workflow
1. **Observe**: Collect only facts (symptoms, logs, stack traces, screenshots, timestamps, environment, versions, reproduction steps). Do not explain anything yet.
2. **Generate Multiple Hypotheses**: Generate at least three independent hypotheses. Never investigate only the first explanation.
3. **Search Upstream First**: Before runtime instrumentation, search framework issues, release notes, changelogs, maintainer discussions, known limitations, and dependency issues. If an official explanation already exists, stop.
4. **Create a Minimal Reproduction**: Reproduce outside the production repository whenever possible.
5. **Perform Falsification**: Do not attempt to prove the leading hypothesis; seek experiments to prove it wrong.
6. **Evidence Classification**: Every finding must be classified as defined in GOV-INV-002.
7. **Confidence Assignment**: Every major conclusion must include confidence (High, Medium, Low).
8. **Stop Conditions**: Stop immediately if exit criteria defined in GOV-INV-003 are met.

---

## GOV-INV-002 — Claims Must Match Evidence
Prevent investigations from overstating certainty.

### Rule
Every conclusion must use language that accurately reflects the available evidence. Do not present an inference as a verified fact, a hypothesis as a root cause, or an opinion as a framework bug.

### Required Classification
Every major conclusion must be explicitly labeled as one of:
- **Verified Fact**
- **Experimental Result**
- **Inference**
- **Hypothesis**
- **Unknown**

### Evidence Promotion Rules
A conclusion may only be promoted to **Verified Fact** when supported by at least two independent evidence categories (e.g., runtime instrumentation, minimal reproduction, official source code, official documentation).

### Framework Bug Claims
Never classify behavior as a framework bug unless it is reproduced in an isolated repository, independent of application code, reproduced across supported versions, and no existing upstream issue explains it.

---

## GOV-INV-003 — Investigation Exit Criteria
Prevent investigations from continuing after sufficient evidence has been collected.

### Rule
An investigation must stop when:
1. The root cause has High confidence.
2. Remaining uncertainties do not change the engineering decision.
3. New investigation steps are producing confirmation rather than new evidence.
4. A practical remediation has already been identified.
5. Additional work is only improving explanation rather than changing conclusions.
