# Governance Incident Report: [Incident Identifier]

> **Investigation Standard Compliance**: This report complies with the Workspace Investigation Standards (**GOV-INV-001** and **GOV-INV-002**). All findings and conclusions are explicitly classified and assigned confidence levels based on the available evidence.

---

## Evidence Summary

| Evidence Component | Status | Source/Notes |
| :--- | :---: | :--- |
| CI Error Log Output | **Collected/Missing** (✅/❌) | |
| Local Replication Attempt | **Collected/Missing** (✅/❌) | |
| Root Cause Reproduced Locally | **Collected/Missing** (✅/❌) | |
| Exact CI Workspace File Contents | **Collected/Missing** (✅/❌) | |
| Exact CI Tool Versions | **Collected/Missing** (✅/❌) | |
| File Hash Comparison (CI vs. Local) | **Collected/Missing** (✅/❌) | |

---

## Confidence Scale
- **High**: Supported by direct, independently reproducible evidence and verified facts.
- **Medium**: Supported by multiple observations, but requires additional independent verification.
- **Low**: Plausible explanation that has not yet been reproduced, verified, or falsified.

---

## 1. Failure Category Classification

### Finding: [Describe Failure, e.g. Build-time Transpilation Failure]
- **Classification**: [Verified Observation / Verified Fact / Hypothesis]
- **Confidence**: [High / Medium / Low]
- **Evidence**:
  - [List direct evidence supporting this classification]

---

## 2. Execution Flow and Stop Point

Describe the pipeline execution steps and indicate exactly where the execution halted:

```
[Trigger] ➔ [Command Runner] ➔ [Transpiler/Compiler] ➔ [Parser (STOP POINT)] ➔ [Execution]
```

Detailed Flow:
1. ...
2. ...

---

## 3. Parser Failure Location vs. Candidate Hypotheses

### Finding: Parser Failure Location
- **Classification**: [Verified Observation / Verified Fact / Hypothesis]
- **Confidence**: [High / Medium / Low]
- **Evidence**:
  - [Specify line number and file path reported by compiler/test log]

### Hypothesis A: [Hypothesis Name]
- **Classification**: Hypothesis
- **Confidence**: [High / Medium / Low]
- **Description**: ...
- **Falsification/Verification Results**:
  - [Describe verification tests and whether they succeeded or failed to reproduce/disprove the hypothesis]

### Hypothesis B: [Hypothesis Name]
- **Classification**: Hypothesis
- **Confidence**: [High / Medium / Low]
- **Description**: ...
- **Falsification/Verification Results**:
  - [Describe verification tests]

---

## 4. Git History Trace
- **Commit SHA**: ...
- **Commit Message**: ...
- **Introduced Date**: ...
- **Classification**: [Verified Fact / Inference]
- **Confidence**: [High / Medium / Low]
- **Detail**: [Explain how/when this file or error was introduced in history]

---

## 5. Branch Comparison Matrix

| Branch / Revision | Classification | Confidence | Status / Observations |
| :--- | :--- | :--- | :--- |
| `develop` | | | |
| `feat/[feature-branch]` | | | |
| `[other-branch]` | | | |

---

## 6. Next Verification Steps
Describe the planned steps to collect missing evidence or run falsification tests:
1. ...
2. ...

---

## 7. Evidence Not Yet Available
List all variables that prevent a conclusive confirmation of the root cause:
- ...
- ...

---

## 8. Investigation Status
- **Status**: [Open / Closed]
- **Root cause identified**: [Yes / No]
- **Parser failure reproduced locally**: [Yes / No]
- **Environmental discrepancy identified**: [Yes / No]
- **Recommended action**: ...

---

## 9. Investigation Decision Log
- **Decision ID**: `GOV-INV-DEC-XXX`
- **Current Decision**: ...
- **Reason**: ...
- **Revisit Trigger**: ...
