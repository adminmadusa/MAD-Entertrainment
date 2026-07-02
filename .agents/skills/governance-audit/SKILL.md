# Governance Audit Skill

---
name: "governance-audit"
description: "Audit repository code, layout, and documentation against MAD Entertrainment compliance rules."
---

## Purpose
Enforce the static and dynamic verification gates of the repository's governance engine, preventing violations from entering protected branches.

## When to Use
- Before staging files for commit.
- Before opening a Pull Request.
- During CI workflow configuration checks.
- When investigating structural consistency, file organization, or dependency paths.

## Inputs
- **Changed files**: Identified via `git diff` or `git status`.
- **Governance rules**: Defined in `scripts/governance/rules/`.
- **Existing findings**: Located in `.governance/findings/`.

## Outputs
- **Audit reports**: Located in `reports/governance/`.
- **Validation exit codes**: 0 for success, non-zero for blockages.

## Constraints
- **Audit-Only**: Never edit, refactor, or delete files during a run.
- **Ratchet boundaries**: Respect the active `GOVERNANCE_MAX_WARNINGS` threshold in CI configuration.
- **SSOT boundaries**: Business rules belong strictly to the server; the frontend must not calculate or validate backend contracts.

## Examples
### Running the static document check
```bash
pnpm run governance:docs
```

### Running the workspace configuration audit
```bash
pnpm run audit-data
```

## Related Skills
- [pr-review](../pr-review/SKILL.md)
- [documentation](../documentation/SKILL.md)
