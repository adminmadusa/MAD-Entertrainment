# Ticket Audit Examples

* **Violation Unprotected Scanner endpoint**:
  - Code:
    ```ts
    router.post('/verify', scanController.verifyTicket); // Auth role middleware omitted
    ```
  - Finding output: ruleId `VAL-ARC-001`, severity `CRITICAL`, message: "Endpoint '/scanner/verify' is missing scanner/admin role authentication middleware."
