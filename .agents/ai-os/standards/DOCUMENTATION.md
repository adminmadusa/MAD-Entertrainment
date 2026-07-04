---
title: AI Operating System — Documentation Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Documentation Standards

This document records the Markdown metadata formats, file path routing, and linking standards.

---

### STD-DOC-001
* **Rule ID**: STD-DOC-001
* **Title**: Markdown Metadata Header
* **Description**: Knowledge files must begin with a standardized YAML metadata block specifying title, version, status, owner, creation date, update date, and dependencies.
* **Severity**: High
* **Scope**: Markdown files (.md) in `.agents/` directory
* **Rationale**: Enables automated parsers to build dependency graphs and trace document lifecycles.
* **Repository Evidence**: Standard baseline headers.
* **Verification Method**: Static file review.
* **Example**:
  ```yaml
  ---
  title: Document Title
  version: 1.0.0
  status: active
  owner: Platform Team
  created: 2026-06-28
  updated: 2026-06-28
  depends_on: []
  supersedes: []
  ---
  ```

---

### STD-DOC-002
* **Rule ID**: STD-DOC-002
* **Title**: Absolute File Scheme Linking
* **Description**: Links referencing codebase files or knowledge documents must use absolute paths with the `file://` scheme.
* **Severity**: High
* **Scope**: Markdown links
* **Rationale**: Absolute file schema linking prevents broken paths when documents are read across different application contexts or remote IDEs.
* **Repository Evidence**: Monorepo documentation linking conventions.
* **Verification Method**: Automated markdown link parser checks.
