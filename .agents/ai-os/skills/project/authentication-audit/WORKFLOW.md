# Authentication Audit Workflow

1. **Scan Route Definitions**: Scans routes under `/auth` for validation middleware.
2. **Evaluate Controller Methods**: Checks passwordless login/verification functions for OTP hash constraints (e.g. SHA-256 OTP digest matching).
3. **Verify Token Signings**: Confirms JWT payload structures match architectural standards.
4. **Log violations**: Emits findings for discrepancies.
