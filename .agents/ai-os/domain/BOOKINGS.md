---
title: AI Operating System — Bookings Domain
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
  - .agents/ai-os/domain/GLOSSARY.md
  - .agents/ai-os/domain/BUSINESS_RULES.md
  - .agents/ai-os/domain/STATE_MACHINES.md
supersedes: []
---

# Bookings Domain

This document describes the business workflows, rules, and constraints governing ticket purchases and reservations.

---

## 1. Workflows

### Checkout Creation & Inventory Locking
1. **Selection**: Customer chooses an event, target ticket tiers, quantities, and seats (if event mode is `seat_based`).
2. **Fingerprint**: The system generates a unique selection fingerprint from the selection parameters to ensure checkout integrity.
3. **Discount**: If a coupon code is supplied, the coupon domain validates it and applies the calculated discount.
4. **Locking**: The reservation system places a 10-minute lock (`BR-BOOKING-003`) on the selected seats/inventory counts.
5. **Record Creation**: Creates a Booking record in the `pending` state, capturing customer email, selected tiers, and locked seat IDs.
6. **Expiration Monitoring**: An active timeout worker releases inventory and sets the status to `expired` if payment is not received within the 10-minute window.
7. **Confirmation**: Upon receiving verified payment gateway notifications, the booking transitions to `confirmed` (triggering ticket generation).

---

## 2. Invariants & Rules
* **Max Purchase Limit**: A single booking request must not exceed 10 total tickets across all selected tiers (`BR-BOOKING-002`).
* **Consolidation Rule**: Duplicate ticket requests for the same tier in a single order are consolidated into a single tier line item to simplify billing.
* **Integrity Lock**: If the selection fingerprint changes between step 1 and step 4, the transaction is rejected to prevent pricing manipulation.
* **No Direct Refund**: An unpaid booking can never be directly refunded (`BR-BOOKING-001`).
