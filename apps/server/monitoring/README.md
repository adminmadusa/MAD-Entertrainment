# Monitoring & Observability Runbook

## Overview

```txt
/api/metrics
      ↓
Prometheus
      ↓
Grafana
      ↓
Alertmanager
```

- Scrape flow: Prometheus scrapes `GET /api/metrics` from the API.
- Dashboard flow: Grafana reads Prometheus time series and renders the dashboard JSON in this folder.
- Alert flow: Prometheus evaluates rule groups and sends active alerts to Alertmanager.

---

## Repository Layout

```txt
monitoring/
├── grafana/
│   └── payment-observability-dashboard.json
└── prometheus/
    └── payment-alert-rules.yml
```

---

## Prometheus Setup

Add a scrape job (adjust host/port for your environment):

```yaml
scrape_configs:
  - job_name: "mad-payment-api"
    metrics_path: /api/metrics
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets:
          - localhost:3001
```

Recommendations:

- `scrape_interval`: `15s` (good balance for queue/webhook visibility)
- `scrape_timeout`: `10s`
- `evaluation_interval`: `30s`

---

## Alert Rule Loading

Rule file in repo:

- `monitoring/prometheus/payment-alert-rules.yml`

Example Prometheus config:

```yaml
rule_files:
  - /etc/prometheus/rules/payment-alert-rules.yml
```

Reload options:

1. SIGHUP Prometheus process
2. `POST /-/reload` if lifecycle reload is enabled
3. Restart Prometheus service/pod

Verify:

- Open Prometheus UI -> `Status` -> `Rules`
- Confirm `payment-observability-alerts` group is loaded

---

## Grafana Dashboard Import

Dashboard file:

- `monitoring/grafana/payment-observability-dashboard.json`

Import steps:

1. Grafana -> Dashboards -> Import
2. Upload JSON file
3. Select Prometheus datasource for `DS_PROMETHEUS`
4. Save dashboard

Recommended dashboard refresh:

- `30s` for production
- `10s-15s` during incidents

Notes:

- Dashboard UID is `payment-observability`
- Panels are grouped by: Payment Reliability, Outbox Health, Queue Infrastructure, Infrastructure Health

---

## Metric Reference

| Metric                                       | Meaning                                |
| -------------------------------------------- | -------------------------------------- |
| `outbox_queue_depth`                         | Pending/retry outbox event count       |
| `outbox_processing_count`                    | Outbox events currently processing     |
| `outbox_failure_count`                       | Outbox events in failed state          |
| `outbox_dead_letter_count`                   | Outbox events moved to dead letter     |
| `outbox_retry_count`                         | Outbox events with attempts > 1        |
| `outbox_processing_latency_ms`               | Average outbox processing latency      |
| `webhook_received_count`                     | Total webhook events observed in store |
| `webhook_processing_count`                   | Webhooks currently processing          |
| `webhook_failed_count`                       | Webhooks in failed state               |
| `webhook_replay_count`                       | Duplicate/replay webhook observations  |
| `webhook_processing_duration_ms`             | Average webhook processing duration    |
| `queue_waiting_jobs{queue=...}`              | Waiting jobs per queue                 |
| `queue_active_jobs{queue=...}`               | Active jobs per queue                  |
| `queue_failed_jobs{queue=...}`               | Failed jobs per queue                  |
| `queue_oldest_waiting_job_age_ms{queue=...}` | Age of oldest waiting job per queue    |
| `diagnostics_dlq_failed_total`               | Legacy DLQ document count              |
| `redis_connected`                            | Redis connectivity (`1` up, `0` down)  |
| `mongodb_ready_state`                        | Mongoose ready state (`1` expected)    |

---

## Alert Severities

- `critical`: immediate on-call response required
  - Risk: payment reliability, stuck workflows, data drift
- `high`: urgent investigation needed
  - Risk: degradation trend, retry storms, growing backlog
- `warning`: monitor and schedule remediation
  - Risk: early indicator before user impact

Current rule file includes `critical` and `high` severities.

---

## Troubleshooting Guide

### Redis disconnected (`redis_connected == 0`)

Likely causes:

- Redis outage/network policy issue
- expired credentials/URL changes

First response:

1. Check Redis endpoint health
2. Validate `REDIS_URL` and connectivity from API runtime
3. Check fallback/degraded mode behavior and queue lag

### Mongo disconnected (`mongodb_ready_state != 1`)

Likely causes:

- Mongo outage/network path issue
- auth/SSL changes

First response:

1. Check Mongo cluster health
2. Validate app credentials and TLS settings
3. Confirm reconnection behavior in logs

### Outbox dead-letter growth (`outbox_dead_letter_count > 0`)

Likely causes:

- poison payload
- handler bug or downstream hard failure

First response:

1. Inspect outbox dead-letter events and `lastError`
2. Identify dominant `eventType`
3. Fix handler/downstream and re-drive failed items safely

### Webhook failure spike (`rate(webhook_failed_count[5m])`)

Likely causes:

- provider signature/config mismatch
- provider outage
- regression in verification/settlement code

First response:

1. Check webhook failure logs by provider and event type
2. Validate webhook secrets and payload signatures
3. Confirm payment gateway status pages

### Queue stall (`queue_oldest_waiting_job_age_ms` high)

Likely causes:

- worker down
- worker saturation
- Redis latency

First response:

1. Check worker processes/pods
2. Check queue depths and concurrency settings
3. Scale workers horizontally if backlog persists

### Outbox backlog growth (`increase(outbox_queue_depth[10m])`)

Likely causes:

- consumer lag
- downstream slowness

First response:

1. Check outbox processing/failure/retry metrics
2. Identify slow handler type
3. Scale outbox worker or isolate problematic handler

---

## Production Recommendations

- Prometheus scrape interval: `15s`
- Rule evaluation interval: `30s`
- Prometheus retention:
  - minimum `15d` for trend analysis
  - `30-90d` if storage budget allows
- Grafana refresh: `30s` normal, `10-15s` during incidents
- Alert cooldown/tuning:
  - keep `for` durations to avoid flapping
  - start with current thresholds, tune after real traffic baselines
- Worker scaling guidance:
  - scale on queue depth + oldest waiting age + failure rate
  - prioritize outbox worker when `outbox_queue_depth` or `outbox_retry_count` trends up

### Outbox Worker Tuning Knobs

Environment variables:

- `OUTBOX_WORKER_BATCH_SIZE` (default `20`)
- `OUTBOX_WORKER_CONCURRENCY` (default `4`)
- `OUTBOX_WORKER_POLL_INTERVAL_MS` (default `2000`)
- `OUTBOX_WORKER_HEARTBEAT_MS` (default `5000`)
- `OUTBOX_STALE_LOCK_MS` (default `60000`)
- `OUTBOX_MAX_ATTEMPTS` (default `8`)

Benchmark scripts:

- `pnpm bench:webhook-storm`
- `pnpm bench:outbox-backlog`
- `pnpm bench:retry-storm`
- `pnpm bench:collect-baseline <profile>`

Preset profiles:

- `apps/server/scripts/load/profiles/low-traffic.env`
- `apps/server/scripts/load/profiles/burst-traffic.env`
- `apps/server/scripts/load/profiles/webhook-storm.env`
- `apps/server/scripts/load/profiles/retry-storm.env`

Runner:

- `apps/server/scripts/load/run-baseline.sh <profile>`
  - Example: `apps/server/scripts/load/run-baseline.sh webhook-storm`
- `apps/server/scripts/load/collect-baseline.sh <profile>`
  - Captures pre/post `/api/metrics` snapshots, run timing, git commit, worker config metadata, and key delta metrics.
  - Writes artifacts to `apps/server/monitoring/reports/raw/`:
    - `before-<profile>-<timestamp>.prom`
    - `after-<profile>-<timestamp>.prom`
    - `run-<profile>-<timestamp>.log`
    - `summary-<profile>-<timestamp>.md`

---

## Hand-off Notes

- Metrics endpoint: `GET /api/metrics`
- System diagnostics endpoint: `GET /api/admin/diagnostics/system` (admin auth required)
- Keep alert thresholds traffic-aware; revisit after baseline collection.
