---
title: AI Operating System — Payments Domain
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
  - .agents/ai-os/domain/GLOSSARY.md
  - .agents/ai-os/domain/STATE_MACHINES.md
supersedes: []
---

# Payments Domain

This document describes the business workflows, gateway interfaces, and security rules governing monetary transactions and validations.

---

## 1. Workflows

### Checkout Initialization & Gateway Routing
1. **Initiate**: When a booking enters the `awaiting_payment` state, the customer selects Stripe or Razorpay.
2. **Session Creation**: The system calls the respective gateway API to create a checkout session or order matched to the exact booking amount and supported currencies (INR, USD, GBP, EUR).
3. **Redirection**: Customer completes checkout on the gateway's secure interface.

### Transaction Verification (Webhooks)
1. **Webhook Reception**: The gateway dispatches a secure callback webhook to the platform.
2. **Signature Validation**: The system validates the webhook's signature using secure credentials.
3. **Integrity Checks**: Verify that the payment amount matches the booking record total and checks for mock identifiers.
4. **Execution**: If checks pass, transitions payment status to `paid` and triggers booking confirmation.

---

## 2. Invariants & Rules
* **Production Integrity**: Mock identifiers (e.g. `pi_mock_*`, `pay_mock_*`, `order_mock_*`) are strictly blocked in production environments. Any detection triggers immediate security locks and blocks transaction execution.
* **Currency Constraint**: Transactions are locked to the supported list: INR, USD, GBP, EUR.
* **Signature Enforcement**: webhooks missing valid cryptographic signatures are rejected.
* **Double Processing Protection**: webhooks processed for already confirmed/paid bookings are ignored to prevent duplicate orders.
