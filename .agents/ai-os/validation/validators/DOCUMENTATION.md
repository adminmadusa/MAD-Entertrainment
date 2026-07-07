---
title: AI Operating System — Documentation Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Documentation Validator

* **Purpose**: Enforces absolute file linking formats and validates YAML metadata.
* **Scope**: All markdown documents (.md) under `.agents/` path.
* **Inputs**: Markdown file contents.
* **Outputs**: Link path alerts.
* **Required Knowledge Layers**: Standards (Documentation).
* **Detection Strategy**: Regex parsing to check link schemes (must use absolute `file://` scheme) and YAML headers structure.
* **Rule IDs**: VAL-DOC-001 (relative links), VAL-DOC-002 (missing/invalid metadata header).
* **Severity Levels**: HIGH (relative links), HIGH (invalid metadata).
* **Confidence Score**: 1.0.
* **Auto-fix Capability**: Yes (reformat links).
* **False Positive Risks**: Zero.
* **Dependencies**: YAML and Markdown parsers.
* **Related Standards**: [DOCUMENTATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DOCUMENTATION.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: None.
* **Related Governance Rules**: [LIFECYCLE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/LIFECYCLE.md).
