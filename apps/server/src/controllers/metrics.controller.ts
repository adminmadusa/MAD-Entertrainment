import { Request, Response } from "express";

import { DiagnosticsService } from "../services/diagnostics.service";

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function metricLine(
  name: string,
  value: number,
  labels?: Record<string, string | number>,
): string {
  if (!labels || Object.keys(labels).length === 0) return `${name} ${value}`;
  const labelText = Object.entries(labels)
    .map(([k, v]) => `${k}="${esc(String(v))}"`)
    .join(",");
  return `${name}{${labelText}} ${value}`;
}

export async function getPrometheusMetrics(
  _req: Request,
  res: Response,
): Promise<void> {
  const report = await DiagnosticsService.generateReport();

  const lines: string[] = [];
  lines.push("# HELP queue_waiting_jobs Number of waiting jobs by queue.");
  lines.push("# TYPE queue_waiting_jobs gauge");
  for (const queue of report.queues) {
    lines.push(
      metricLine("queue_waiting_jobs", queue.waiting, { queue: queue.name }),
    );
    lines.push(
      metricLine("queue_active_jobs", queue.active, { queue: queue.name }),
    );
    lines.push(
      metricLine("queue_failed_jobs", queue.failed, { queue: queue.name }),
    );
    lines.push(
      metricLine(
        "queue_oldest_waiting_job_age_ms",
        queue.oldestWaitingJobAgeMs,
        { queue: queue.name },
      ),
    );
    lines.push(
      metricLine("queue_delayed_jobs", queue.delayed, { queue: queue.name }),
    );
    lines.push(
      metricLine("queue_completed_jobs", queue.completed, {
        queue: queue.name,
      }),
    );
  }

  lines.push(
    "# HELP diagnostics_dlq_failed_total Number of dead-letter jobs in legacy DLQ collection.",
  );
  lines.push("# TYPE diagnostics_dlq_failed_total gauge");
  lines.push(
    metricLine("diagnostics_dlq_failed_total", report.dlq.totalFailedCount),
  );

  lines.push(
    "# HELP redis_connected Redis connection status (1 connected, 0 disconnected).",
  );
  lines.push("# TYPE redis_connected gauge");
  lines.push(metricLine("redis_connected", report.redis.connected ? 1 : 0));

  lines.push("# HELP mongodb_ready_state MongoDB readyState from mongoose.");
  lines.push("# TYPE mongodb_ready_state gauge");
  lines.push(metricLine("mongodb_ready_state", report.database.readyState));

  lines.push("# HELP socket_connected_clients Total websocket clients.");
  lines.push("# TYPE socket_connected_clients gauge");
  lines.push(
    metricLine("socket_connected_clients", report.sockets.connectedClients),
  );

  lines.push(
    "# HELP socket_admin_clients Total connected admin websocket clients.",
  );
  lines.push("# TYPE socket_admin_clients gauge");
  lines.push(metricLine("socket_admin_clients", report.sockets.adminClients));

  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.status(200).send(lines.join("\n") + "\n");
}
