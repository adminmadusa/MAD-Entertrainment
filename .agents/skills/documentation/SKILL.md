---
name: "documentation"
description: "Maintain and audit repository documentation structure, metadata, relative links, and user-facing writing copy (Humanizer tone rules)."
version: "1.1"
owner: "Technical Writer"
last_updated: "2026-07-03"
depends_on: "None"
supersedes: "Humanizer"
scope: "Documentation"
priority: "Core"
---

# Documentation Governance Skill

## Purpose
Ensure all repository guides, READMEs, changelogs, runbooks, and PR summaries are structurally accurate, linked correctly, and clearly written.

## Trigger Keywords
README, CONTRIBUTING, CHANGELOG, ADR, RUNBOOK, DEPLOYMENT, GOVERNANCE, API reference, migration guide, testing guide, developer guide, troubleshooting, FAQ, markdown, Humanizer, tone, PR description, technical writing, docs, documentation review, documentation audit, README review, PR documentation, release documentation, onboarding documentation, runbook review.

## Prerequisites
- Verify the technical accuracy of information before writing.
- Review existing documentation to avoid duplicating content.
- Verify that referenced files, folders, and code symbols still exist.
- Verify terminology consistency with existing repository definitions.

## Documentation Principles
- **Accuracy before polish**: Ensure technical correctness first.
- **One source of truth**: Store metadata, rules, and workflows in their designated authoritative files.
- **Keep doc synced with code**: Update documentation in the same change stream as implementation changes.
- **Prefer updating over creating**: Update existing documents before creating new ones.
- **Keep examples executable**: Do not write hypothetical or non-working sample code.
- **Avoid redundant explanations**: State concepts clearly and concisely.
- **Explain why, not just what**: Document the architectural intent and constraints.

## Documentation Standards
- Use consistent heading hierarchy.
- Prefer relative links.
- Use repository terminology consistently.
- Keep Markdown lint compliant.
- Avoid screenshots when text or diagrams are sufficient.
- Keep examples synchronized with implementation.

## Documentation Workflow
Before editing or creating documentation:
1. **Determine scope**: Identify the target audience and document boundaries.
2. **Review existing documents**: Scan the repository for overlapping guides or sections.
3. **Verify implementation**: Confirm that the code mirrors the documented behavior.
4. **Identify gaps**: Locate missing or outdated details.
5. **Update content**: Edit only the necessary files.
6. **Validate references**: Ensure relative links and file paths are valid and correctly cased.
7. **Verify examples**: Ensure commands, code snippets, configuration examples, and API examples are still valid.
8. **Verify formatting**: Apply standard Markdown rules.
9. **Produce summaries**: Write concise summaries for PR templates or changelogs.
10. **Check for duplication**: Ensure no parallel manuals exist.
11. **Validate consistency**: Ensure terminology, capitalization, headings, and naming conventions are consistent across related documents.
12. **Final review**: Self-review copy against readability standards.

## Responsibilities

### 1. Repository Guides & Runbooks
- **README & Onboarding**: Maintain installation guides, environment configurations, setup guides, and contributor guides.
- **Runbooks & Operations**: Document operational runbooks, operations manuals, deployments, backups, and migrations.
- **API Documentation**: Maintain endpoint references and request/response specifications.
- **Architecture Documentation**: Consume ADRs and maintain system architecture documentation.
- **Governance & Testing Guides**: Maintain governance documentation, compliance rules, and testing manuals.

### 2. Architecture ADR Documents
- **ADR Drafting**: Creates or updates ADR documents when requested.
- **No Design Power**: Does not make architectural decisions (those belong strictly to **architecture-review**).

### 3. Changelogs & Release Notes
- **PR Descriptions**: Generate clear, technical PR summaries detailing changes, risks, and verification.
- **Changelog & Releases**: Maintain chronological histories of changes.

### 4. Humanizer Copy-Writing Guidelines
- **Professional Clarity**: Keep language professional, removing awkward or vague phrasing.
- **Targeted Audience**: Write for the intended audience (developers, operators, contributors, administrators).
- **Active Voice**: Prefer active voice.
- **Preserve Precision**: Write with technical accuracy, avoiding generic analogies.
- **Consistent Terminology**: Keep terminology consistent across documents.
- **Conciseness**: Eliminate unnecessary verbosity and repetition.
- **Readability & Grammar**: Target high clarity, readability, correct grammar, and audience awareness. Avoid turning it into a creative writing assistant.

## Documentation Quality Checklist
Every documentation update should verify:
- Technical accuracy
- Link validity
- Example correctness
- Markdown formatting
- Metadata completeness
- Naming consistency
- No duplicated content
- Grammar and spelling
- Repository terminology
- Readability

## Verification Requirements
Every documentation change should verify:
- Internal links
- External links (when appropriate)
- Commands execute successfully
- File paths exist
- Code examples compile or remain valid
- Terminology matches the repository

## Typical Inputs
- Markdown files
- READMEs
- ADRs
- PR descriptions
- Release notes
- Changelogs
- Runbooks

## Typical Outputs
- Updated documentation
- Corrected Markdown
- PR summaries
- Release notes
- Changelogs
- Documentation review reports

## Boundaries
- **When to Use**:
  - Editing markdown files, runbooks, or repository guides.
  - Generating changelogs, release notes, or PR descriptions.
  - Reviewing relative document path links and owner metadata.
- **When NOT to Use**:
  - Designing system architecture (use **architecture-review**).
  - Isolating or debugging compiler, test, or runtime errors (use **ci-investigation**).
  - Implementing or modifying governance validators and fixers (use **governance-audit**).
  - Performing UI styling reviews or design checklists (use **ui-ux**).
  - Managing git staging and branch lifecycles (use **git-workflow**).

## Non-Goals
This skill never:
- Designs software architecture.
- Debugs production issues.
- Implements validators.
- Reviews UI/UX.
- Manages Git branches.
- Approves pull requests.

## Reuse Policy
Before creating documentation:
- Search existing documents first.
- Update existing documents before creating new ones.
- Reuse document templates.
- Link instead of duplicating.
- Keep one authoritative source.
- Reuse existing diagrams before creating new ones.
- Extend existing manuals before introducing new documentation.
- Reference authoritative documents rather than copying content.
- Maintain one canonical source for each topic.

## Skill Relationships
Primary:
- documentation

Collaborates with:
- architecture-review
- governance-audit
- ci-investigation
- git-workflow
- pr-review

Does Not Replace:
- architecture-review
- governance-audit
- ci-investigation
- ui-ux
- git-workflow
- pr-review
