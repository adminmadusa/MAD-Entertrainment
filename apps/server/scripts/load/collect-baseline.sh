#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-low-traffic}"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$BASE_DIR/../../../.." && pwd)"
SERVER_DIR="$ROOT_DIR/apps/server"
PROFILE_FILE="$BASE_DIR/profiles/${PROFILE}.env"

if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "Unknown profile: $PROFILE"
  exit 1
fi

set -a
source "$PROFILE_FILE"
set +a

BASE_URL="${BASE_URL:-http://localhost:3001}"
METRICS_URL="${METRICS_URL:-$BASE_URL/api/metrics}"
REPORTS_DIR="$SERVER_DIR/monitoring/reports"
RAW_DIR="$REPORTS_DIR/raw"
TIMESTAMP_UTC="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_ID="${TIMESTAMP_UTC}-${PROFILE}"
BEFORE_FILE="$RAW_DIR/before-${PROFILE}-${TIMESTAMP_UTC}.prom"
AFTER_FILE="$RAW_DIR/after-${PROFILE}-${TIMESTAMP_UTC}.prom"
RUN_LOG="$RAW_DIR/run-${PROFILE}-${TIMESTAMP_UTC}.log"
SUMMARY_FILE="$RAW_DIR/summary-${PROFILE}-${TIMESTAMP_UTC}.md"

mkdir -p "$RAW_DIR"

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_tool curl
require_tool awk
require_tool date
require_tool git

collect_metrics_snapshot() {
  local target_file="$1"
  curl -fsS "$METRICS_URL" -o "$target_file"
}

metric_sum() {
  local file="$1"
  local metric="$2"
  awk -v metric="$metric" '
    BEGIN { sum = 0 }
    $0 !~ /^#/ && $1 ~ ("^" metric "([\\{ ]|$)") { sum += $NF }
    END { printf "%.6f", sum }
  ' "$file"
}

metric_value() {
  local file="$1"
  local metric="$2"
  awk -v metric="$metric" '
    BEGIN { found = 0; value = 0 }
    $0 !~ /^#/ && $1 ~ ("^" metric "([\\{ ]|$)") { value = $NF; found = 1; exit }
    END {
      if (found == 1) printf "%.6f", value;
      else printf "0.000000";
    }
  ' "$file"
}

num_delta() {
  awk -v before="$1" -v after="$2" 'BEGIN { printf "%.6f", (after - before) }'
}

cpu_count="$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo "unknown")"
mem_bytes="$(getconf _PHYS_PAGES 2>/dev/null || true)"
page_bytes="$(getconf PAGE_SIZE 2>/dev/null || true)"
if [[ -n "${mem_bytes:-}" && -n "${page_bytes:-}" ]]; then
  memory_gib="$(awk -v p="$mem_bytes" -v s="$page_bytes" 'BEGIN { printf "%.2f", (p*s)/(1024*1024*1024) }')"
else
  memory_gib="unknown"
fi

git_commit="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
run_started_epoch="$(date +%s)"
run_started_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Collecting pre-run metrics from $METRICS_URL"
collect_metrics_snapshot "$BEFORE_FILE"

echo "Running baseline for profile: $PROFILE"
set +e
"$BASE_DIR/run-baseline.sh" "$PROFILE" 2>&1 | tee "$RUN_LOG"
run_exit_code="${PIPESTATUS[0]}"
set -e

run_ended_epoch="$(date +%s)"
run_ended_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
run_duration_sec="$((run_ended_epoch - run_started_epoch))"

echo "Collecting post-run metrics from $METRICS_URL"
collect_metrics_snapshot "$AFTER_FILE"

before_outbox_depth="$(metric_sum "$BEFORE_FILE" "outbox_queue_depth")"
after_outbox_depth="$(metric_sum "$AFTER_FILE" "outbox_queue_depth")"
delta_outbox_depth="$(num_delta "$before_outbox_depth" "$after_outbox_depth")"

before_outbox_retry="$(metric_sum "$BEFORE_FILE" "outbox_retry_count")"
after_outbox_retry="$(metric_sum "$AFTER_FILE" "outbox_retry_count")"
delta_outbox_retry="$(num_delta "$before_outbox_retry" "$after_outbox_retry")"

before_outbox_dlq="$(metric_sum "$BEFORE_FILE" "outbox_dead_letter_count")"
after_outbox_dlq="$(metric_sum "$AFTER_FILE" "outbox_dead_letter_count")"
delta_outbox_dlq="$(num_delta "$before_outbox_dlq" "$after_outbox_dlq")"

before_webhook_failed="$(metric_sum "$BEFORE_FILE" "webhook_failed_count")"
after_webhook_failed="$(metric_sum "$AFTER_FILE" "webhook_failed_count")"
delta_webhook_failed="$(num_delta "$before_webhook_failed" "$after_webhook_failed")"

before_webhook_replay="$(metric_sum "$BEFORE_FILE" "webhook_replay_count")"
after_webhook_replay="$(metric_sum "$AFTER_FILE" "webhook_replay_count")"
delta_webhook_replay="$(num_delta "$before_webhook_replay" "$after_webhook_replay")"

before_queue_failed="$(metric_sum "$BEFORE_FILE" "queue_failed_jobs")"
after_queue_failed="$(metric_sum "$AFTER_FILE" "queue_failed_jobs")"
delta_queue_failed="$(num_delta "$before_queue_failed" "$after_queue_failed")"

before_oldest_wait_ms="$(metric_sum "$BEFORE_FILE" "queue_oldest_waiting_job_age_ms")"
after_oldest_wait_ms="$(metric_sum "$AFTER_FILE" "queue_oldest_waiting_job_age_ms")"
delta_oldest_wait_ms="$(num_delta "$before_oldest_wait_ms" "$after_oldest_wait_ms")"

outbox_avg_processing_ms_before="$(metric_value "$BEFORE_FILE" "outbox_processing_latency_ms")"
outbox_avg_processing_ms_after="$(metric_value "$AFTER_FILE" "outbox_processing_latency_ms")"
outbox_avg_processing_ms_delta="$(num_delta "$outbox_avg_processing_ms_before" "$outbox_avg_processing_ms_after")"

webhook_avg_processing_ms_before="$(metric_value "$BEFORE_FILE" "webhook_processing_duration_ms")"
webhook_avg_processing_ms_after="$(metric_value "$AFTER_FILE" "webhook_processing_duration_ms")"
webhook_avg_processing_ms_delta="$(num_delta "$webhook_avg_processing_ms_before" "$webhook_avg_processing_ms_after")"

throughput_per_sec="$(awk -F': ' '/"rps"/ { gsub(/[, ]/, "", $2); print $2; found=1 } END { if (found != 1) print "n/a" }' "$RUN_LOG")"
p95_latency_ms="n/a"

cat >"$SUMMARY_FILE" <<EOF
# Baseline Collection Summary

- Run ID: \`$RUN_ID\`
- Profile: \`$PROFILE\`
- Metrics endpoint: \`$METRICS_URL\`
- Git commit: \`$git_commit\`
- Start (UTC): \`$run_started_utc\`
- End (UTC): \`$run_ended_utc\`
- Duration (sec): \`$run_duration_sec\`
- Exit code: \`$run_exit_code\`

## System Metadata

- CPU count: \`$cpu_count\`
- Memory (GiB): \`$memory_gib\`
- Mongo tier: \`${MONGODB_TIER:-unknown}\`
- Redis tier: \`${REDIS_TIER:-unknown}\`
- Worker concurrency: \`${OUTBOX_WORKER_CONCURRENCY:-unknown}\`
- Batch size: \`${OUTBOX_WORKER_BATCH_SIZE:-unknown}\`
- Poll interval ms: \`${OUTBOX_WORKER_POLL_INTERVAL_MS:-unknown}\`

## Raw Artifacts

- Before metrics: \`$BEFORE_FILE\`
- After metrics: \`$AFTER_FILE\`
- Run log: \`$RUN_LOG\`

## Metric Deltas (after - before)

- outbox_queue_depth: \`$delta_outbox_depth\`
- outbox_retry_count: \`$delta_outbox_retry\`
- outbox_dead_letter_count: \`$delta_outbox_dlq\`
- webhook_failed_count: \`$delta_webhook_failed\`
- webhook_replay_count: \`$delta_webhook_replay\`
- queue_failed_jobs (sum across queues): \`$delta_queue_failed\`
- queue_oldest_waiting_job_age_ms (sum across queues): \`$delta_oldest_wait_ms\`

## Throughput & Latency

- throughput/sec: \`$throughput_per_sec\`
- p95 latency ms: \`$p95_latency_ms\`
- outbox avg processing duration ms (after): \`$outbox_avg_processing_ms_after\`
- outbox avg processing duration ms delta: \`$outbox_avg_processing_ms_delta\`
- webhook avg processing duration ms (after): \`$webhook_avg_processing_ms_after\`
- webhook avg processing duration ms delta: \`$webhook_avg_processing_ms_delta\`
EOF

echo "Wrote summary: $SUMMARY_FILE"
if [[ "$run_exit_code" -ne 0 ]]; then
  echo "Baseline run failed (exit code $run_exit_code). Metrics snapshots and summary were still captured."
  exit "$run_exit_code"
fi
