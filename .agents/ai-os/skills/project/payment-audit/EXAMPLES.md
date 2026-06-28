# Payment Audit Examples

* **Violation Mock checkout in live example**:
  - Adapter checks `pi_mock_` tokens without environment checks.
  - Finding output: ruleId `VAL-SEC-001`, severity `CRITICAL`, message: "Mock Stripe transaction token processed outside environment protection."
