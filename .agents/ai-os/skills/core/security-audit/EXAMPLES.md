# Security Audit Examples

* **Violation Mock checkout example**:
  - Code:
    ```ts
    if (paymentId.startsWith('pi_mock_')) {
      return confirmBooking(paymentId);
    }
    ```
  - Finding output: ruleId `VAL-SEC-001`, severity `CRITICAL`, message: "Mock payment validation is bypass-enabled in production context."
* **Violation Webhook check example**:
  - Code:
    ```ts
    app.post('/webhook', (req, res) => {
      handleEvent(req.body); // missing signature verification checks
    });
    ```
  - Finding output: ruleId `VAL-SEC-002`, severity `CRITICAL`, message: "Webhook endpoint is missing signature header validation."
