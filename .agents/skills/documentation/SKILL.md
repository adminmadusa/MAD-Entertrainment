# Documentation Governance Skill

---
name: "documentation"
description: "Maintain, audit, and organize markdown files according to the repository SSOT hierarchy."
---

## Purpose
Ensure all repository documentation is structured, accurate, linked correctly, and contains the required metadata for governance compliance.

## When to Use
- When creating or modifying root-level SSOT documents.
- When drafting an Architecture Decision Record (ADR).
- When updating roadmaps, runbooks, or change logs.

## Inputs
- **SSOT files**: Markdown documents like `README.md`, `REPOSITORY_GOVERNANCE.md`, etc.
- **Link paths**: Relative filesystem links or commit permalinks.
- **Metadata fields**: Document owner, status, version, review cycle, last updated.

## Outputs
- **Formatted Markdown**: Compliant with GitHub Flavored Markdown (GFM).
- **Metadata blocks**: Standardized headers at the top of each document.

## Constraints
- **Case-Sensitive Paths**: All reference links must match filesystem casing exactly (e.g. `AGENTS.MD` on case-sensitive filesystems).
- **No Local Absolute Paths**: Never link using local workstation paths (e.g., `file:///Users/...` or `/tmp/...`).
- **No Placeholders**: Never commit empty files or unlinked templates.
- **Document Ownership**: Ensure every document lists its owner role matching the matrix in `REPOSITORY_GOVERNANCE.md`.

## Examples
### Metadata Header Example
```markdown
# My Document Title

- **Owner**: Repository Governance Owner
- **Status**: Active
- **Version**: 1.0
- **Review Cycle**: Ongoing
- **Last Updated**: YYYY-MM-DD
- **Related Documents:**
  - [README.md](README.md)
```

## Related Skills
- [governance-audit](../governance-audit/SKILL.md)
