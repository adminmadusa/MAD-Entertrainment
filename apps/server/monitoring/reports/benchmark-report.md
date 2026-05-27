# Benchmark Report

> Execution status: **blocked in current Codex sandbox** due outbound DNS/network restrictions to configured MongoDB SRV host (`ECONNREFUSED querySrv`).
> Use `apps/server/scripts/load/profiles/*.env` + `apps/server/scripts/load/run-baseline.sh` in a network-enabled environment and paste measured values below.

## Scope

- Outbox worker throughput/latency under:
  - low load
  - burst load
  - webhook storm
  - retry storm

## Environment

- Commit:
- Date:
- Node version:
- Mongo version/tier:
- Redis version/tier:
- Worker config:
  - OUTBOX_WORKER_BATCH_SIZE=
  - OUTBOX_WORKER_CONCURRENCY=
  - OUTBOX_WORKER_POLL_INTERVAL_MS=
  - OUTBOX_WORKER_HEARTBEAT_MS=

## Baseline Results

| Scenario      | events/sec | avg latency ms | p95 latency ms | retry amplification | DLQ growth/min |
| ------------- | ---------: | -------------: | -------------: | ------------------: | -------------: |
| low load      |            |                |                |                     |                |
| burst load    |            |                |                |                     |                |
| webhook storm |            |                |                |                     |                |
| retry storm   |            |                |                |                     |                |

## Tuned Results

| Scenario      | events/sec | avg latency ms | p95 latency ms | retry amplification | DLQ growth/min |
| ------------- | ---------: | -------------: | -------------: | ------------------: | -------------: |
| low load      |            |                |                |                     |                |
| burst load    |            |                |                |                     |                |
| webhook storm |            |                |                |                     |                |
| retry storm   |            |                |                |                     |                |

## Summary

- Throughput delta:
- Latency delta:
- Stability notes:
