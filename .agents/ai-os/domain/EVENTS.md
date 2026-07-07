---
title: AI Operating System — Business Event Triggers
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
  - .agents/ai-os/domain/ENTITIES.md
supersedes: []
---

# Business Event Triggers

This document describes the key business events and their downstream triggers within the MAD Entertrainment platform.

---

## 1. Event Registry

### EV-BOOKING-001: Booking Confirmed
* **Trigger**: A booking status transitions to `confirmed` after payment gateway validation.
* **Downstream Operations**:
  - Generate unique QR codes and PDF passes for each ticket.
  - Dispatch a `booking_confirmed` notification containing PDF attachments to the customer.
  - Broadcast booking state changes to administrative consoles.

### EV-PAYMENT-002: Payment Failed
* **Trigger**: The payment gateway reports a transaction failure or the reservation lock timer expires.
* **Downstream Operations**:
  - Update booking status to `failed` or `expired`.
  - Release all associated seat blocks and ticket quantity locks.
  - Dispatch a `payment_failed` notification alert to the customer.

### EV-REFUND-003: Refund Completed
* **Trigger**: Admin processes a full or partial refund, and the gateway confirms processing.
* **Downstream Operations**:
  - Update booking status to `refunded`.
  - Invalidate the associated tickets (barcode scanning will reject entry).
  - Return the ticket quantities/seats back to the available event pool.
  - Dispatch a `refund_processed` notification to the customer.

### EV-AUTH-004: Auth OTP Requested
* **Trigger**: User inputs email to login or register.
* **Downstream Operations**:
  - Generate hashed OTP token record.
  - Dispatch an email notification containing the 6-digit OTP passcode to the user.

### EV-EVENT-005: Event Cancelled
* **Trigger**: Admin cancels a scheduled event.
* **Downstream Operations**:
  - Update event status to `cancelled`.
  - Trigger bulk refunds for all confirmed ticket bookings.
  - Dispatch `event_cancelled` emails to all ticket holders.
