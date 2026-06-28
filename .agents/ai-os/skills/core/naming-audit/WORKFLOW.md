# Naming Audit Workflow

1. **Collect Paths**: Gathers list of paths in target directories.
2. **Evaluate Casing**: Matches file names against PascalCase for React components and camelCase for logic functions.
3. **Scan Blocks**: Checks folders names against prohibited directories list (e.g. `temp`, `backup`).
4. **Collect Findings**: Emits Finding structs for any mismatch.
5. **Determine Status**: Evaluates success criteria.
