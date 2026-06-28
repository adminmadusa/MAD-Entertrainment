---
title: AI Operating System — Production Mock Payment Anti-Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/anti-patterns/README.md
supersedes: []
---

# Production Mock Payment Anti-Pattern

* **Anti-Pattern ID**: ANT-SEC-001
* **Name**: Sandbox Payment Paths in Live Builds
* **Category**: Security
* **Severity**: Critical
* **Problem**: Allowing mock gateway routes or testing mock transaction IDs (e.g. `pi_mock_123`) to successfully update payment state machines inside production containers.
* **Symptoms**: Confirmed bookings without matching charges inside Stripe or Razorpay consoles.
* **Why It Is Harmful**: Leaving mock payment hooks active in production allows malicious clients to bypass monetary checkouts. Attackers can call callback webhooks using fake transaction tokens, prompting the API server to confirm bookings and dispatch valid PDF entry tickets.
* **Repository Evidence**: Production assertions in `apps/server/src/services/admin/refund.service.ts` checking for `pi_mock_` tokens.
* **Related Standards**: [SECURITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/SECURITY.md#STD-SEC-001).
* **Related Architecture**: [SECURITY_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/SECURITY_ARCHITECTURE.md).
* **Related Pattern**: [MOCK_PAYMENT_LOCK.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/security/MOCK_PAYMENT_LOCK.md).
* **Detection Method**:
  - **AI Check**: Search payment processing adapters for variables containing "mock" or "test" that do not verify environment status (`NODE_ENV === 'production'`).
  - **Static Analysis**: Audit checks scanning checkout flows.
* **Prevention Strategy**: Assert environment configuration on payment boot; throw exceptions if sandbox IDs are parsed in production.
* **Refactoring Strategy**: wrap mock paths in environment validation checks.
* **Verification Method**: Execute integration test suites (`pnpm test`).
* **Examples**:
  ```ts
  // BAD: Mock payment ID is accepted unconditionally
  async function confirmTransaction(paymentId: string) {
    if (paymentId.startsWith('pi_mock_')) {
      return confirmBooking(paymentId);
    }
  }

  // GOOD: Mock payment ID is blocked in production
  async function confirmTransaction(paymentId: string) {
    if (paymentId.startsWith('pi_mock_')) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MOCK_PAYMENT_RUNTIME_BLOCKED');
      }
      return confirmBooking(paymentId);
    }
  }
  ```
