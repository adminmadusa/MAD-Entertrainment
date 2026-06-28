---
title: AI Operating System — Tickets Domain
version: 1.0.0
status: active
owner: Domain Expert + Backend Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/domain/README.md
  - .agents/ai-os/domain/GLOSSARY.md
  - .agents/ai-os/domain/BOOKINGS.md
supersedes: []
---

# Tickets Domain

This document describes the workflows, generation formats, and gate check-in scanning constraints governing ticket admittance codes.

---

## 1. Workflows

### Ticket Generation & Dispatch
1. **Trigger**: Initiated immediately when a booking status changes to `confirmed`.
2. **Allocation**: Generates a ticket pass for each item in the booking record.
3. **Identifier Assignment**: Assigns a globally unique barcode/QR string.
4. **Rendering**: Renders ticket details (ticket holder name, event date/time, seat ID/tier) into PDF and QR graphics.
5. **Dispatch**: Transmits the passes as email attachments to the ticket holder.

### Entrance Gate Validation
1. **Scan**: Scanner operator scans the ticket QR code at the venue gate.
2. **Lookup**: System retrieves the ticket status and verifies it links to a `confirmed` booking.
3. **Checks**:
   - If ticket status is `valid` / `not checked in` -> Accept. Update status to `scanned` and log timestamp.
   - If ticket status is `scanned` -> Reject with "Ticket already scanned" warning.
   - If ticket status is `cancelled` / `refunded` -> Reject with "Ticket cancelled" warning.

---

## 2. Invariants & Rules
* **Strict Uniqueness**: QR codes/barcodes must be globally unique across all events.
* **Admittance Rule**: One scan per ticket. A scanned ticket is immediately exhausted and cannot grant additional entry.
* **State lock**: Ticket status must synchronize with booking status; if a booking is refunded or cancelled, all child tickets are invalidated.
