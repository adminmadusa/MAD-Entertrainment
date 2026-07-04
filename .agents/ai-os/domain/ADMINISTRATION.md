---
title: AI Operating System — Administration Domain
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
  - .agents/ai-os/domain/GLOSSARY.md
  - .agents/ai-os/domain/BUSINESS_RULES.md
supersedes: []
---

# Administration Domain

This document describes the administrative controls, promotional coupon rules, and refund verification workflows.

---

## 1. Workflows

### Coupon Management & Verification
1. **Creation**: Admin creates a coupon defining a code (e.g. `MAD10`), discount configuration (flat value or percentage-based), expiry date, and maximum usage count.
2. **Standardization**: The coupon code is forced to uppercase and trimmed.
3. **Application**: During booking checkout, the coupon is verified:
   - Must be within validity date limits.
   - Current usage count must not exceed usage caps.
   - Discount value is calculated and deducted from booking totals.

### Refund Control Lifecycle
1. **Initiate**: Admin requests a refund for a `confirmed` booking, specifying the amount (full or partial).
2. **Constraint Check**: Verifies that the proposed refund amount does not exceed the total transaction cost of the booking (`BR-REFUND-001`).
3. **Gateway Dispatch**: Initiates the refund processing with Stripe or Razorpay.
4. **Reconcile**: Upon gateway confirmation, updates status to `completed`, invalidates the ticket QR codes, and releases seats back to the available pool.

---

## 2. Invariants & Rules
* **Scanner Quarantine**: Accounts assigned to the `scanner` role must be isolated strictly to gate ticket check-ins. Scanner accounts cannot modify events, coupons, user rosters, or process booking refunds.
* **Coupon Code Uniqueness**: Coupon identifiers must be unique to prevent pricing conflicts.
* **Refund Transaction Match**: Refunds can only target confirmed, paid bookings.
