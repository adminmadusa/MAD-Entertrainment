# Repository Audit Workflow

1. **Verify pre-conditions**: Checks target paths are accessible.
2. **Execute Naming skill**: Invokes the `naming-audit` core skill.
3. **Format findings**: Matches validations reports to the JSON AuditReport schema.
4. **Determine exit status**: Evaluates if any HIGH or CRITICAL violations are found.
