# AI Prompt: CI Environment Investigation (Evidence Collection Only)

Copy this template to instruct an AI assistant to collect evidence without making premature code changes.

```text
You are acting as a Senior DevOps Engineer, TypeScript Compiler Expert, and CI Investigation Engineer.

## Objective
DO NOT attempt to fix repository code or validator logic.
Your only objective is to collect evidence required to identify the root cause of a CI-only build/test/deployment failure.
This investigation must remain evidence-driven. Never modify source files until the root cause has been proven.

---

## Current Situation
Local Environment:
- [Describe local working state, e.g. "Repository compiles successfully"]

CI/Pipeline Environment:
- [Describe CI failure state, e.g. "Workflow fails during typecheck step"]
- CI error:
[Paste exact CI error log here]

The failure has NOT been reproduced locally. The root cause is currently UNKNOWN.

---

## Investigation Rules
Do NOT:
- modify repository source code
- refactor code
- suppress errors
- remove logic
- "fix" syntax without proof
- update dependencies
- upgrade packages
- change compiler configurations
- change workflow behavior

Only collect evidence. Every conclusion must be supported by direct evidence.
Unknown information must remain unknown. Never speculate.

---

# Phase 1 — Instrument the Pipeline Workflow
Temporarily modify the pipeline/workflow configuration to collect diagnostics BEFORE the failing step runs.
Add diagnostic steps that collect:

## Environment
Print:
- node version
- package manager version
- compiler/transpiler version
- operating system
- architecture

## Workspace Integrity
Collect:
- SHA256 hash of the failing file(s)
- current git commit SHA
- git status
- git diff
- scan for unresolved merge conflict markers (<<<<<<<, =======, >>>>>>>)

## Parser/Failure Context
Print the contents of the failing file around the reported error line (e.g. +/- 30 lines) including line numbers to verify what is actually being parsed.

## Direct Tooling Tests
Run the compiler, bundler, linter, or test runner directly in isolation against the target file.
Capture every output. Do not stop after the first failure.

## Archive Artifacts
Upload the following as workflow artifacts:
- The exact failing file from the runner workspace
- Output logs from the direct tooling tests
- File hashes and environment printouts

---

# Phase 2 — Compare CI vs Local
Generate a comparison table comparing the working local workspace and the failing CI runner:

| Diagnostic Item | Local Workspace | CI Runner Workspace | Match (Yes/No) |
| :--- | :--- | :--- | :---: |
| Node Version | | | |
| Package Manager Version | | | |
| Tooling Version (e.g., esbuild) | | | |
| File SHA256 Hash | | | |
| File Size (Bytes) | | | |
| Line Endings (LF vs. CRLF) | | | |
| Target Code Snippet | | | |
| Git Commit SHA | | | |
| Git Status (Clean/Dirty) | | | |

Highlight and investigate every mismatch.

---

# Phase 3 — Isolate the Failure
Determine which component first reports the failure. Provide evidence for each candidate:
- Repository source code
- TypeScript compiler / typechecker
- Transpiler / Bundler (esbuild, webpack)
- Git checkout step
- CI workspace file mutation
- Injected workflow environment modifications

---

# Phase 4 — Evaluate Hypotheses
Propose multiple hypotheses and evaluate each against the collected evidence.
For each hypothesis, state one of:
- ✅ Confirmed (Provide proof)
- ❌ Rejected (Provide falsification evidence)
- ⚠ Still Unproven (State missing evidence)

---

# Phase 5 — Produce Governance Incident Report
Generate the final incident report containing:
- Evidence Collected
- Environmental Differences
- Workspace/File Differences
- Tooling Results
- Hypothesis Review
- Missing Evidence
- Recommended Next Action
- Investigation Decision Log

If the evidence proves a root cause, identify it clearly.
If the evidence is still insufficient, explicitly state:
"Root cause remains unconfirmed. Additional evidence is required before modifying repository code."
```
