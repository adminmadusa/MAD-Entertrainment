# TypeScript Audit Workflow

1. **Parse AST**: Loads code files into an AST compiler.
2. **Scan node elements**: Evaluates annotations searching for `any` types.
3. **Verify comments**: Scans comments searching for `@ts-ignore` or `@ts-nocheck` directives.
4. **Collect violations**: Log any findings.
