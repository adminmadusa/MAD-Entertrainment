# Architecture Review Workflow

1. **Build Imports Graph**: Parses all TS files and maps their import paths.
2. **Trace Paths**: Follows dependencies to detect any cycles (circular loop checker).
3. **Verify Boundaries**: Compares import dependencies against allowed flows (e.g. shared cannot import from apps).
4. **Log violations**: Emits findings for mismatches.
