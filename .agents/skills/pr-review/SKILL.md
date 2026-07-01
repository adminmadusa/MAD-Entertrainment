# PR Review Skill

---
name: "pr-review"
description: "Verify PR readiness and perform checks against the 11-question quality gate."
---

## Purpose
Ensure all changes proposed in a Pull Request comply with code standards, testing rules, and the repository-wide quality checklist.

## When to Use
- When preparing a feature branch for PR submission.
- When performing a code review on another contributor's PR.
- When verifying build and test validation outputs before merging.

## Inputs
- **PR Diff**: Git diff of changes against the base branch (`develop` or `live`).
- **Verification Logs**: Console output of lint, type check, build, and test steps.
- **Rollback Plan**: Documentation explaining how to safely revert the change.

## Outputs
- **Completed PR Checklist**: The 11 questions defined in `PULL_REQUEST_TEMPLATE.md`.
- **Review Verdict**: Approve, request changes, or block merge.

## Constraints
- **PR Quality Gate**: No PR can be merged if any of the 11 questions from `AGENTS.MD` answer with a governance violation.
- **File Size Limits**:
  - Components: < 300 lines (301-500 requires review, 701+ requires refactor, 1000+ blocked).
  - Services: < 500 lines (501-700 requires review, 701+ requires refactor).
  - Hooks: < 250 lines.
  - Schemas: < 300 lines.
  - Controllers: < 200 lines.
- **No Stacked PRs**: Each PR must address exactly one standalone issue.

## Examples
### Verifying compliance checklist
Refer to [REPOSITORY_GOVERNANCE.md#pull-request--review-requirements](file:///Users/admin/Desktop/MAD%20Entertrainment/REPOSITORY_GOVERNANCE.md#pull-request--review-requirements) for reviewer matrices.

## Related Skills
- [git-workflow](../git-workflow/SKILL.md)
- [architecture-review](../architecture-review/SKILL.md)
