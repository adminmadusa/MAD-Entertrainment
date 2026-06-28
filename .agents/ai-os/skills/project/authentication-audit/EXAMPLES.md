# Authentication Audit Examples

* **Violation OTP example**:
  - Controller code uses raw unhashed OTP checks instead of crypto digest matches.
  - Finding output: ruleId `VAL-SEC-002`, severity `CRITICAL`, message: "OTP validation checks do not use SHA-256 cryptographic digest hashing verifications."
