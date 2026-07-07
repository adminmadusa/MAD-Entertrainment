# AI Agent Operating System
Version: 2.0
Last Updated: 2026-07-04

This document defines the mandatory **Execution Protocol**, **Repository Preservation Rules**, and **Investigation Workflow** for all AI agents operating in this workspace.

---

# GLOBAL MANDATORY GATE — IMPLEMENTATION DECISION GATE

No implementation or file modification may begin until the Implementation Readiness Audit has concluded with one of the approved outcomes.

Every new feature, function, button, link, API, database change, bug fix, refactor, or enhancement must first have a GitHub issue created, then undergo a repository audit to verify whether the requested functionality already exists or is partially implemented.

Every request must follow this sequence:

```text
Request
   ↓
Issue Created
   ↓
Implementation Readiness Audit
   ↓
Repository Search
   ↓
Implementation Decision Gate
   ↓
Approved?
   ├── Already Implemented → Close/Document
   ├── Partially Implemented → Extend Existing
   ├── Rejected → Close Request
   └── Not Implemented → Create Branch
                                ↓
                          Implement
```

Every request must end with exactly one decision:
* [ ] Already Implemented
* [ ] Partially Implemented
* [ ] Not Implemented
* [ ] Rejected

### Decision Outcomes & Actions:

1. **Outcome A — Already Implemented**
   - **Conditions**: Feature exists, behaviour matches requirements, and tests pass.
   - **Action**: STOP. Do NOT implement. Reject any implementation PR. Create documentation updates only if required. Close or convert the issue. No production code changes are permitted.

2. **Outcome B — Partially Implemented**
   - **Conditions**: Feature exists but is incomplete.
   - **Action**: Extend the existing implementation. Reuse existing architecture. Do not duplicate logic. Permits extending existing code only.

3. **Outcome C — Not Implemented**
   - **Conditions**: Feature does not exist.
   - **Action**: Proceed with implementation following the approved governance workflow. Permits new implementation on a new branch.

4. **Outcome D — Rejected**
   - **Conditions**: Duplicate issue, duplicate feature, invalid request, architecture conflict, superseded by another issue, or out of scope.
   - **Action**: Close the request immediately without implementation.

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

---

# PART 4 — UI/UX GOVERNANCE

## Reference Standard

All UI/UX standards are canonically defined in [UI_UX_GOVERNANCE.md](../UI_UX_GOVERNANCE.md) (UI-001).

This document is the **Single Source of Truth** for all front-end design standards in the MAD Entertrainment repository.

## Authority Order for UI Work

| Priority | Source |
|----------|--------|
| 1 | Repository Source Code |
| 2 | `UI_UX_GOVERNANCE.md` |
| 3 | `.agents/skills/ui-ux/SKILL.md` |
| 4 | This file (`AGENTS.md`) |
| 5 | External Best Practices |

If a conflict exists between any skill, rule, or external reference and `UI_UX_GOVERNANCE.md`, the governance document takes precedence.

## Mandatory Compliance Rules

Every AI agent performing any UI work must:

1. **Read `UI_UX_GOVERNANCE.md` first** — before writing any code, component, or style.
2. **Complete all 10 pre-implementation audit phases** as defined in UI-001 Section 19.
3. **Search `packages/ui` before creating any new component** — reuse existing shared components.
4. **Attach screenshot evidence** (desktop + tablet + mobile) to every UI GitHub issue and PR.
5. **Clear the UI-001 merge gate** before any UI PR may be approved.

## UI PR Merge Gate (Summary)

A UI pull request cannot be merged if any of the following exist:

- Mobile layout broken.
- Responsive layout fails at any required breakpoint (320px, 375px, 768px, 1024px, 1440px).
- Duplicate UI components introduced without justification.
- Existing shared component from `packages/ui` ignored without justification.
- Missing loading, empty, or error states.
- Poor accessibility (fails WCAG AA).
- Touch targets smaller than 44×44px.
- Desktop and mobile screenshots not attached.

Refer to [UI_UX_GOVERNANCE.md](../UI_UX_GOVERNANCE.md) Section 22 for the complete merge gate checklist.

## UI Pull Request Checklist

Every UI pull request must include this checklist in its PR description:

```
UI-001 Pull Request Checklist

[ ] Mobile-first layout implemented
[ ] Responsive at all required breakpoints (320px, 375px, 768px, 1024px, 1440px)
[ ] Tabs used instead of deep menus where appropriate
[ ] Buttons aligned consistently
[ ] Consistent spacing applied
[ ] No horizontal scrolling
[ ] Loading state implemented
[ ] Empty state implemented
[ ] Error state implemented
[ ] Accessibility verified (WCAG AA)
[ ] Shared components reused (packages/ui searched first)
[ ] Desktop screenshot attached
[ ] Tablet screenshot attached
[ ] Mobile screenshot attached
[ ] All UI-001 merge gate conditions cleared
```

---

# PART 5 — TASK COMPLETION EVIDENCE GATE

To prevent premature task completion declarations and enforce the Git boundary, marking a task or milestone as **"Complete" is strictly forbidden** unless the AI agent provides verified repository evidence for each of the following phases:

1. **Feature Branch Creation**
   - Must show the active task-specific branch (e.g. `feat/*`, `fix/*`).
   - *Evidence*: `git branch --show-current` output.
2. **Staged and Committed Code**
   - Working tree must be completely clean.
   - *Evidence*: `git status` output showing `nothing to commit, working tree clean` and the commit SHA via `git log -1`.
3. **Pushed to Remote Origin**
   - The changes must be successfully pushed to the remote repository.
   - *Evidence*: `git push` command execution output.
4. **Pull Request Created**
   - A pull request must be opened targeting the protected branch.
   - *Evidence*: PR number, title, and PR URL.
5. **CI Gating Verification**
   - CI build/tests must succeed on the branch.
   - *Evidence*: Verification of the GitHub Actions run status.
6. **Merge to Protected Branch**
   - The pull request must be approved and merged.
   - *Evidence*: Merge commit SHA.
7. **Branch Cleanup**
   - Local and remote task branches must be deleted post-merge.
   - *Evidence*: Safe deletion confirmation (`git branch -d` and `git push origin --delete`).
8. **Develop Sync**
   - Switch back to `develop` and pull origin to synchronize the local state.
   - *Evidence*: `git checkout develop && git pull origin develop` output.

