# Hot Path Analysis

> Baseline run note: live measurements were not executable in the current sandbox because database connectivity to remote MongoDB is blocked by environment network policy.

## Candidate Hot Paths

- WebhookEventStore transitions
- Outbox claim/ack/fail loops
- Booking confirm transaction
- Ticket issuance
- Reservation transitions

## Findings Template

| Path | Query/Operation | Avg ms | p95 ms | Lock contention signs | Notes |
| ---- | --------------- | -----: | -----: | --------------------- | ----- |
|      |                 |        |        |                       |       |

## Recommended Actions

1.
2.
3.
