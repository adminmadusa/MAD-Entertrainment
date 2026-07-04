# Bug Fix Workflow

1. **Verify Staging environment**: Confirms current branches map to target environments.
2. **Execute Local Test run**: RunsVitest suite before modifications to confirm baseline failures.
3. **Refactor targets**: Updates code files while preserving typing annotations.
4. **Re-run tests**: Invokes test suite again to confirm resolution.
