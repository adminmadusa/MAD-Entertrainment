# Ticket Audit Workflow

1. **Scan Scanner Endpoints**: Scans routes under `/scanner` for authentication middleware.
2. **Verify Authorization Role**: Confirms endpoint verification check calls require the `SCANNER` or `ADMIN` role.
3. **Audit Ticket Creation**: Evaluates database transaction wrappers on ticket generation endpoints.
4. **Log violations**: Emits findings for missing authentication.
