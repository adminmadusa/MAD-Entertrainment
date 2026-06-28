---
title: AI Operating System — Global Business Rules
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
supersedes: []
---

# Global Business Rules

This document registers the global business rules and invariants enforced across the MAD Entertrainment platform.

---

### BR-BOOKING-001
* **Title**: Invalid Pending to Refunded Transition
* **Description**: A booking cannot transition directly from `pending` or `awaiting_payment` to `refunded`.
* **Owner**: Booking Domain
* **Priority**: Critical
* **Source**: Current codebase state machines
* **Validation**: Booking must enter `confirmed` state first (verifying successful payment) before any refund lifecycle can be triggered.
* **Example**: An unpaid booking created 5 minutes ago cannot be refunded by an admin.

---

### BR-BOOKING-002
* **Title**: Maximum Ticket Limit
* **Description**: A single booking request is restricted to a maximum of 10 tickets across all selected tiers.
* **Owner**: Booking Domain
* **Priority**: High
* **Source**: Shared constants (`MAX_TICKETS_PER_BOOKING`)
* **Validation**: Checks consolidated ticket quantities during checkout creation.
* **Example**: A customer attempting to purchase 11 General Admission tickets in one transaction is blocked.

---

### BR-BOOKING-003
* **Title**: Reservation Lock Timeout
* **Description**: Ticket allocations and seat blocks are secured for a maximum of 10 minutes to allow payment completion.
* **Owner**: Booking Domain
* **Priority**: High
* **Source**: Shared constants (`SEAT_LOCK_TTL_SECONDS`)
* **Validation**: Expired reservation check processes automatically free seat blocks and ticket capacities.
* **Example**: If a user locks a seat and fails to pay within 10 minutes, the seat status is reset to `available`.

---

### BR-AUTH-001
* **Title**: OTP Passcode Cooldown
* **Description**: A customer cannot request a new OTP passcode within 60 seconds of a previous request.
* **Owner**: Authentication Domain
* **Priority**: Medium
* **Source**: OTP request rate limiting
* **Validation**: Cooldown timer is checked upon OTP request.
* **Example**: A user requesting a passcode, and clicking request again after 10 seconds, receives a cooldown lock warning.

---

### BR-AUTH-002
* **Title**: OTP Token Expiry
* **Description**: An OTP passcode becomes invalid 15 minutes after generation.
* **Owner**: Authentication Domain
* **Priority**: High
* **Source**: Auth token schema TTL
* **Validation**: Token creation timestamp is verified upon user entry check.
* **Example**: Entering an OTP passcode generated 16 minutes ago results in an expiration rejection.

---

### BR-REFUND-001
* **Title**: Refund Cap Constraint
* **Description**: The refund amount processed for a booking must not exceed the booking's total price.
* **Owner**: Administration / Refund Domain
* **Priority**: Critical
* **Source**: Refund service validation rules
* **Validation**: Total processed refund sums are tracked per booking.
* **Example**: Attempting to process a $120 refund for a $100 ticket booking is blocked.
