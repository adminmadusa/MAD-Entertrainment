---
title: AI Operating System — Event Management Domain
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

# Event Management Domain

This document describes the workflows, categorization, ticket profiling, and performer scheduling logic of the event lifecycle.

---

## 1. Workflows

### Event Creation & Profiling
1. **Drafting**: Admin configures the event metadata (title, category, date/time, physical venue location or online link).
2. **Performer Allocation**: Schedules and links one or more `DJOperator` profiles to the event.
3. **Ticket Profiling**: Creates ticket profiles defining pricing tiers, capacity counts, and seat configurations.
4. **Layout Setup**: If booking mode is `seat_based`, associates a seat layout grid mapping active/disabled rows and numbers.
5. **Publishing**: Transitions event status from `draft` to `published`, exposing the event on public customer channels.

### Event Status Maintenance
* **Postponement**: Moves status to `postponed` (updates dates; alerts ticket holders).
* **Cancellation**: Moves status to `cancelled` (triggers refund workflows; alerts ticket holders).
* **Completion**: Transitions to `completed` after the scheduled show concludes.

---

## 2. Invariants & Rules
* **Profile Mandatory Requirement**: An event cannot transition to the `published` status without having at least one active ticket profile configured.
* **Modification Block**: Event parameters and ticket profiles are locked and cannot be modified once the event enters the `completed` or `cancelled` terminal states.
* **Sold Out Invariant**: The event's `isSoldOut` status is automatically updated to true when the combined ticket capacities match the reservation and confirmed booking counts.
