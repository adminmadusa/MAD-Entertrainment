---
title: AI Operating System — Webhook Validation Pattern
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/patterns/README.md
supersedes: []
---

# Webhook Validation Pattern

* **Pattern ID**: PAT-SEC-002
* **Name**: Cryptographic Webhook Validation
* **Purpose**: Restricts webhook execution to verified requests originating from trusted payment gateways.
* **Problem Solved**: Attackers can trigger booking confirmation flows by sending fake webhook payloads to public controller endpoints.
* **Applicability**: Stripe and Razorpay webhook routes.
* **Prerequisites**: Secure signing secrets.
* **Responsibilities**: Validates cryptographic payload signatures, rejecting unauthenticated payloads.
* **Participants**: Express routes, gateway SDK verification utilities.
* **Inputs**: Raw request body, signature header.
* **Outputs**: Parsed verified event object.
* **Dependencies**: Express body parser configuration (accessing raw request bytes).
* **Flow**:
  1. Webhook endpoint receives request.
  2. Extracts signature header.
  3. Invokes SDK validation function passing raw body buffer and signing secret.
  4. If validation fails: throws 400 Bad Request error.
  5. If validation passes: proceeds to execute database transaction.
* **Success Criteria**: Webhook processing requires valid cryptographic tokens.
* **Failure Modes**: Missing raw request body parser leading to validation failures.
* **Trade-offs**: Marginally increases response latency for verification.
* **Limitations**: Requires keeping signing secrets updated.
* **Repository Evidence**: Webhook routing setup validations (`INTEGRATION_ARCHITECTURE.md`).
* **Related Standards**: [SECURITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/SECURITY.md).
* **Related Architecture**: [INTEGRATION_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/INTEGRATION_ARCHITECTURE.md).
* **Related Domains**: [PAYMENTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/PAYMENTS.md).
* **Related ADRs**: [ADR-002](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
* **Related Patterns**: None.
* **Related Anti-Patterns**: Accessing transaction IDs directly from webhook JSON payloads without verifying signatures.
* **Examples**:
  ```ts
  // Verify Stripe webhook:
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  ```
* **Verification Checklist**:
  - [x] Route reads raw body buffer.
  - [x] Signature header verification is enforced.
  - [x] Test suite checks rejection rules.
