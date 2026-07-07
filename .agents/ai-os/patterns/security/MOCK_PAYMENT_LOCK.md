---
title: AI Operating System — Mock Payment Lock Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Mock Payment Lock Pattern

* **Pattern ID**: PAT-SEC-001
* **Name**: Production Mock Payment Rejection
* **Purpose**: Safeguards transaction gateways by preventing testing accounts from using fake tokens in production.
* **Problem Solved**: Developers write mock checkouts or test endpoints for integration checks. If these mock endpoints are left open or fail to assert environments, attackers can pass test tokens to bypass payment confirmation flows.
* **Applicability**: Express payment and transaction controller files.
* **Prerequisites**: Environment configurations indicating production modes.
* **Responsibilities**: Evaluates transaction identifiers, throwing exceptions if sandbox keys are submitted in production.
* **Participants**: Payment gateways controller.
* **Inputs**: Payment ID string.
* **Outputs**: Rejection exceptions.
* **Dependencies**: Node environment configuration.
* **Flow**:
  1. Webhook or callback receives request.
  2. Parse payment ID: `if (isMockId(paymentId)) { ... }`.
  3. Check process environment: `if (process.env.NODE_ENV === 'production')`.
  4. Throw critical exception, halt transaction commit.
* **Success Criteria**: Mock tokens trigger rejection errors in production tests.
* **Failure Modes**: Misclassifying actual gateway IDs as mock identifiers.
* **Trade-offs**: Restricts developers from running sandbox checks directly on production.
* **Limitations**: Requires defining explicit identifiers syntax.
* **Repository Evidence**: `apps/server/src/services/admin/refund.service.ts` checking for `pi_mock_` prefixes.
* **Related Standards**: [SECURITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/SECURITY.md#STD-SEC-001).
* **Related Architecture**: [SECURITY_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/SECURITY_ARCHITECTURE.md).
* **Related Domains**: [PAYMENTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/PAYMENTS.md).
* **Related ADRs**: [ADR-002](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Committing fallback payment logic bypassing verification routines in live builds.
* **Examples**:
  ```ts
  function checkPaymentId(id: string) {
    if (process.env.NODE_ENV === 'production' && id.startsWith('pi_mock_')) {
      throw new Error('MOCK_PAYMENT_RUNTIME_BLOCKED');
    }
  }
  ```
* **Verification Checklist**:
  - [x] Checks prefix identifiers.
  - [x] Rejection throws standard runtime errors.
  - [x] Test suite checks rejection rules.
