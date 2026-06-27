# Workspace Investigation Standards
Version: 1.0

## Purpose
This document defines investigation and root-cause analysis standards for this workspace.

These standards supplement the repository [AGENTS.MD](file:///Users/admin/Desktop/MAD%20Entertrainment/AGENTS.MD) and apply only to debugging, incident response, root-cause analysis, and forensic investigations.

If any conflict exists, the repository [AGENTS.MD](file:///Users/admin/Desktop/MAD%20Entertrainment/AGENTS.MD) takes precedence.

---

# GOV-INV-001 — Root Cause Investigation Governance Standard

## Purpose
Prevent incorrect conclusions, confirmation bias, unnecessary deep investigations, and wasted engineering effort by enforcing a disciplined, evidence-based investigation process.

This standard applies to all production incidents, development issues, performance investigations, security investigations, CI/CD failures, framework issues, dependency problems, and infrastructure debugging.

---

## Core Principle
> **A plausible explanation is never a verified root cause.**

No hypothesis may be promoted to a root cause until it survives independent verification and repeated attempts at falsification.

---

## Mandatory Investigation Workflow

### Phase 1 — Observe
Collect only facts.
Record:
* symptoms
* logs
* stack traces
* screenshots
* timestamps
* environment
* versions
* reproduction steps

Do **not** explain anything yet.

Output:
* Verified Facts
* Unknowns

---

### Phase 2 — Generate Multiple Hypotheses
Generate at least three independent hypotheses.
Never investigate only the first explanation.
Example:
* application bug
* framework limitation
* dependency regression
* environment issue
* operating system limit
* infrastructure problem
* configuration error

No hypothesis receives priority without evidence.

---

### Phase 3 — Search Upstream First
Before runtime instrumentation:
Search:
* framework issues
* release notes
* changelogs
* maintainer discussions
* known limitations
* dependency issues

If an official explanation already exists:
Stop.
Do not rediscover known behavior.

---

### Phase 4 — Create a Minimal Reproduction
Reproduce outside the production repository whenever possible.
Requirements:
* isolated repository
* minimum dependencies
* same framework version
* same runtime
* same operating system

Goal:
Determine whether the issue is:
* repository-specific
* framework-specific
* environment-specific

---

### Phase 5 — Perform Falsification
Do not attempt to prove the leading hypothesis.
Instead ask:
> "What experiment would prove this hypothesis is wrong?"

The investigation is incomplete until the primary hypothesis has survived deliberate attempts to falsify it.

---

### Phase 6 — Evidence Classification
Every finding must be classified as exactly one of the types defined in GOV-INV-002.

---

### Phase 7 — Confidence Assignment
Every major conclusion must include confidence:
* **High**: multiple independent evidence sources
* **Medium**: strong evidence, limited independent verification
* **Low**: plausible, additional validation required

---

### Phase 8 — Stop Conditions
The investigation must stop immediately if any of the conditions defined in GOV-INV-003 are met.
Do not continue tracing framework internals once the investigation becomes confirmatory rather than exploratory.

---

# GOV-INV-002 — Claims Must Match Evidence

## Purpose
Prevent investigations from overstating certainty.

---

## Rule
Every conclusion must use language that accurately reflects the available evidence.
Do not present an inference as a verified fact.
Do not present a hypothesis as a root cause.
Do not present an opinion as a framework bug.

---

## Required Classification
Every major conclusion must be explicitly labeled as one of:
* **Verified Fact**
* **Experimental Result**
* **Inference**
* **Hypothesis**
* **Unknown**

The classification must remain unchanged until sufficient independent evidence exists.

---

## Evidence Promotion Rules
A conclusion may only be promoted to **Verified Fact** when supported by at least two independent evidence categories, such as:
* Runtime instrumentation
* Minimal reproduction
* Official source code
* Official documentation
* Maintainer confirmation
* Accepted upstream issue
* Merged framework fix

Multiple observations from the same category count as only one source.

---

## Framework Bug Claims
Never classify behavior as a framework bug unless all of the following are true:
* Reproduced in an isolated repository.
* Independent of application code.
* Reproduced across supported versions.
* Existing documentation does not describe it.
* No existing upstream issue already explains it.
* The expected behavior can be justified using official documentation or framework design.
* A minimal reproduction is available.

Until then, classify it as:
* Possible framework defect
* Undocumented framework limitation
* Unexpected framework behavior

---

## Principle
Evidence determines confidence.
Confidence never determines evidence.

---

# GOV-INV-003 — Investigation Exit Criteria

## Purpose
Prevent investigations from continuing after sufficient evidence has been collected.

---

## Rules
An investigation must stop when ALL of the following are true:
1. The root cause has High confidence.
2. Remaining uncertainties do not change the engineering decision.
3. New investigation steps are producing confirmation rather than new evidence.
4. A practical remediation has already been identified.
5. Additional work is only improving explanation rather than changing conclusions.

If these conditions are met:
- Document remaining unknowns.
- Record confidence levels.
- Record assumptions.
- Produce engineering recommendations.
- End the investigation.

Do not continue tracing deeper framework internals unless doing so could materially change the diagnosis or remediation.
