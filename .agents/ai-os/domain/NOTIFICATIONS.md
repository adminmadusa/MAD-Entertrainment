---
title: AI Operating System — Notifications Domain
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
  - .agents/ai-os/domain/GLOSSARY.md
supersedes: []
---

# Notifications Domain

This document describes the notification types, templates, and communication dispatch workflows.

---

## 1. Notification Types
The platform supports the following notification categories (`NotificationType`):
* `otp`: Magic link verification codes.
* `booking_confirmed`: Ticket PDF confirmations.
* `payment_failed`: Payment failure alerts.
* `refund_processed` (`full_refund` / `partial_refund`): Financial reversal statements.
* `event_reminder` / `event_cancelled` / `event_updated`: Operational event updates.
* `marketing`: Customer promotion messages.

---

## 2. Workflows

### Notification Dispatch
1. **Trigger**: An upstream business event emits a notification trigger.
2. **Compile**: Resolves the message template corresponding to the notification type, injecting customer variables (name, barcodes, timestamps).
3. **Queue**: Enqueues the notification request into the background worker queue.
4. **Dispatch**: Background workers process the queue and dispatch the communication via the SMTP gateway.

---

## 3. Invariants & Rules
* **Opt-out Exemption**: Transactional notifications (`otp`, `booking_confirmed`, `refund_processed`, `event_cancelled`) represent critical customer records and must bypass marketing opt-out flags.
* **Email Validation**: Every outgoing notification must target a verified, normalized email address structure.
