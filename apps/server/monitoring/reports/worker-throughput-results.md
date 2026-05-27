# Worker Throughput Results

## Outbox Worker Config Matrix

| batch | concurrency | poll_ms | heartbeat_ms | events/sec | avg latency ms | p95 latency ms | failures/sec |
| ----: | ----------: | ------: | -----------: | ---------: | -------------: | -------------: | -----------: |
|       |             |         |              |            |                |                |              |

## Recommended Production Defaults

- OUTBOX_WORKER_BATCH_SIZE=
- OUTBOX_WORKER_CONCURRENCY=
- OUTBOX_WORKER_POLL_INTERVAL_MS=
- OUTBOX_WORKER_HEARTBEAT_MS=

## Guardrails

- max retry rate before scale action:
- max oldest waiting job age before page:
