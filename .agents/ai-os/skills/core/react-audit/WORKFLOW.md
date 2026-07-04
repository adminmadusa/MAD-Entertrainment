# React Safety Audit Workflow

1. **Load Source Nodes**: Imports React source code nodes.
2. **Scan Globals**: Identifies calls to `window` or `document` variables during standard rendering sweeps.
3. **Verify Context**: Checks if accesses are wrapped in React hooks (e.g. `useEffect`) or guard variables (e.g. `isMounted`).
4. **Log Mismatch Warnings**: Emits findings for raw accesses.
